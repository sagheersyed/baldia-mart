import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Prescription } from './prescription.entity';
import { PrescriptionQuotation } from './prescription-quotation.entity';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { User } from '../../users/user.entity';

/**
 * PrescriptionExpiryScheduler — automated cron jobs for:
 * 1. Expiring stale pending prescriptions (>72 hours without review)
 * 2. Expiring quotations past their expiresAt timestamp
 * 3. Expiring approved prescriptions past their validUntil date
 * 4. Sending pre-expiry warnings to customers (1 hour before quotation expires)
 */
@Injectable()
export class PrescriptionExpiryScheduler {
  private readonly logger = new Logger(PrescriptionExpiryScheduler.name);

  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionQuotation)
    private readonly quotationRepo: Repository<PrescriptionQuotation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly complianceService: ComplianceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Every 15 minutes: expire quotations past their expiresAt timestamp.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredQuotations() {
    this.logger.debug('Checking for expired quotations...');

    try {
      const expired = await this.quotationRepo.find({
        where: {
          status: 'pending' as any,
          expiresAt: LessThanOrEqual(new Date()),
        },
        relations: ['prescription'],
      });

      if (expired.length === 0) return;

      this.logger.log(`Found ${expired.length} expired quotation(s). Processing...`);

      for (const quotation of expired) {
        quotation.status = 'expired';
        await this.quotationRepo.save(quotation);

        // Log compliance event
        await this.complianceService.log({
          eventType: 'quotation_expired',
          prescriptionId: quotation.prescriptionId,
          userId: quotation.prescription?.userId,
          details: `Quotation #${quotation.id.slice(0, 8)} expired. Final amount: Rs. ${quotation.finalAmount}`,
          severity: 'info',
          actorType: 'system',
        });

        // Notify customer
        if (quotation.prescription?.userId) {
          const user = await this.userRepo.findOne({ where: { id: quotation.prescription.userId } });
          if (user?.fcmToken) {
            await this.notificationsService.sendToUser(
              user.id,
              user.fcmToken,
              '⏰ Quotation Expired',
              `Your prescription quotation of Rs. ${quotation.finalAmount} has expired. Please upload again or contact support.`,
            ).catch(e => this.logger.error('FCM failed:', e));
          }
        }
      }

      this.logger.log(`Expired ${expired.length} quotation(s) successfully.`);
    } catch (e) {
      this.logger.error('Failed to process expired quotations:', e);
    }
  }

  /**
   * Every hour: send pre-expiry warnings for quotations expiring in the next hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePreExpiryWarnings() {
    this.logger.debug('Checking for quotations expiring soon...');

    try {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const now = new Date();

      // Find pending quotations expiring in the next hour
      const expiringSoon = await this.quotationRepo
        .createQueryBuilder('q')
        .innerJoinAndSelect('q.prescription', 'p')
        .where('q.status = :status', { status: 'pending' })
        .andWhere('q.expiresAt > :now', { now })
        .andWhere('q.expiresAt <= :soon', { soon: oneHourFromNow })
        .getMany();

      if (expiringSoon.length === 0) return;

      this.logger.log(`Sending pre-expiry warnings for ${expiringSoon.length} quotation(s)...`);

      for (const quotation of expiringSoon) {
        if (!quotation.prescription?.userId) continue;
        const user = await this.userRepo.findOne({ where: { id: quotation.prescription.userId } });
        if (!user?.fcmToken) continue;

        const minutesLeft = Math.round((quotation.expiresAt.getTime() - now.getTime()) / 60000);
        await this.notificationsService.sendToUser(
          user.id,
          user.fcmToken,
          '⚠️ Quotation Expiring Soon!',
          `Your prescription quotation of Rs. ${quotation.finalAmount} expires in ${minutesLeft} minutes. Accept now to avoid re-submission.`,
        ).catch(e => this.logger.error('FCM failed:', e));
      }
    } catch (e) {
      this.logger.error('Failed to process pre-expiry warnings:', e);
    }
  }

  /**
   * Daily at 2 AM: expire stale pending prescriptions (>72 hours without review).
   */
  @Cron('0 2 * * *')
  async handleStalePrescriptions() {
    this.logger.debug('Checking for stale pending prescriptions...');

    try {
      const staleThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago

      const stale = await this.prescriptionRepo.find({
        where: {
          status: 'pending',
          createdAt: LessThanOrEqual(staleThreshold),
        },
      });

      if (stale.length === 0) return;

      this.logger.log(`Found ${stale.length} stale prescription(s). Expiring...`);

      for (const prescription of stale) {
        prescription.status = 'expired';
        await this.prescriptionRepo.save(prescription);

        await this.complianceService.log({
          eventType: 'prescription_auto_expired',
          prescriptionId: prescription.id,
          userId: prescription.userId,
          details: `Prescription auto-expired after 72 hours without review. Uploaded: ${prescription.createdAt.toISOString()}`,
          severity: 'warning',
          actorType: 'system',
        });

        // Notify customer
        const user = await this.userRepo.findOne({ where: { id: prescription.userId } });
        if (user?.fcmToken) {
          await this.notificationsService.sendToUser(
            user.id,
            user.fcmToken,
            '📋 Prescription Expired',
            'Your prescription was not reviewed within 72 hours and has been expired. Please upload it again.',
          ).catch(e => this.logger.error('FCM failed:', e));
        }
      }

      this.logger.log(`Auto-expired ${stale.length} stale prescription(s).`);
    } catch (e) {
      this.logger.error('Failed to process stale prescriptions:', e);
    }
  }

  /**
   * Daily at 3 AM: expire approved prescriptions past their validUntil date.
   */
  @Cron('0 3 * * *')
  async handleExpiredValidity() {
    this.logger.debug('Checking for prescriptions past validity...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expired = await this.prescriptionRepo
        .createQueryBuilder('p')
        .where('p.status = :status', { status: 'approved' })
        .andWhere('p.validUntil IS NOT NULL')
        .andWhere('p.validUntil < :today', { today })
        .getMany();

      if (expired.length === 0) return;

      this.logger.log(`Found ${expired.length} prescription(s) past validity. Expiring...`);

      for (const prescription of expired) {
        prescription.status = 'expired';
        await this.prescriptionRepo.save(prescription);

        await this.complianceService.log({
          eventType: 'prescription_validity_expired',
          prescriptionId: prescription.id,
          userId: prescription.userId,
          details: `Prescription validity expired. Valid until: ${prescription.validUntil}. Refills used: ${prescription.refillsUsed}/${prescription.maxRefills}`,
          severity: 'info',
          actorType: 'system',
        });
      }

      this.logger.log(`Expired ${expired.length} prescription(s) past validity.`);
    } catch (e) {
      this.logger.error('Failed to process expired validity prescriptions:', e);
    }
  }
}
