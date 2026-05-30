import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MedicineReminder } from './medicine-reminder.entity';
import { RefillReminder } from './refill-reminder.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(MedicineReminder)
    private readonly reminderRepo: Repository<MedicineReminder>,
    @InjectRepository(RefillReminder)
    private readonly refillRepo: Repository<RefillReminder>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly logger = new Logger(RemindersService.name);

  async create(userId: string, dto: Partial<MedicineReminder>) {
    const reminder = this.reminderRepo.create({
      ...dto,
      userId,
      isActive: true,
    });
    return this.reminderRepo.save(reminder);
  }

  async findByUser(userId: string) {
    return this.reminderRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, userId: string, dto: Partial<MedicineReminder>) {
    const reminder = await this.reminderRepo.findOne({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    
    Object.assign(reminder, dto);
    return this.reminderRepo.save(reminder);
  }

  async delete(id: string, userId: string) {
    const reminder = await this.reminderRepo.findOne({ where: { id, userId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    
    reminder.isActive = false;
    return this.reminderRepo.save(reminder);
  }

  // ── Refill Reminders ──────────────────────────────────────────

  async createRefill(userId: string, medicineName: string, daysSupply: number = 30) {
    const nextRefillDate = new Date();
    nextRefillDate.setDate(nextRefillDate.getDate() + daysSupply);

    const refill = this.refillRepo.create({
      userId,
      medicineName,
      daysSupply,
      nextRefillDate,
      lastPurchaseDate: new Date(),
    });
    return this.refillRepo.save(refill);
  }

  async getRefills(userId: string) {
    return this.refillRepo.find({
      where: { userId, isActive: true },
      order: { nextRefillDate: 'ASC' },
    });
  }

  async deleteRefill(id: string, userId: string) {
    const refill = await this.refillRepo.findOne({ where: { id, userId } });
    if (refill) {
      refill.isActive = false;
      await this.refillRepo.save(refill);
    }
  }

  // ── Scheduled Tasks ──────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkUpcomingRefills() {
    this.logger.log('Checking for upcoming prescription refills...');
    
    const threeDaysFromNowStart = new Date();
    threeDaysFromNowStart.setDate(threeDaysFromNowStart.getDate() + 3);
    threeDaysFromNowStart.setHours(0, 0, 0, 0);

    const threeDaysFromNowEnd = new Date(threeDaysFromNowStart);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999);

    const refillsDue = await this.refillRepo.find({
      where: {
        nextRefillDate: Between(threeDaysFromNowStart, threeDaysFromNowEnd),
        isActive: true,
        autoRemind: true,
      },
      relations: ['user'],
    });

    for (const refill of refillsDue) {
      if (refill.user?.fcmToken) {
        await this.notificationsService.sendToUser(
          refill.userId,
          refill.user.fcmToken,
          'Refill Reminder! 💊',
          `Your supply of ${refill.medicineName} is running low. Re-order now to ensure continuous treatment.`
        ).catch(e => this.logger.error(`Failed to send refill alert to ${refill.userId}: ${e.message}`));
      }
    }

    this.logger.log(`Refill check complete. Sent ${refillsDue.length} alerts.`);
  }
}
