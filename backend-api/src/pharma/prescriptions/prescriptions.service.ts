import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prescription } from './prescription.entity';
import { ComplianceService } from '../compliance/compliance.service';
import { User } from '../../users/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectQueue('prescription-verification')
    private readonly verificationQueue: Queue,
    private readonly complianceService: ComplianceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Upload a new prescription — enters the verification queue automatically.
   */
  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.prescriptionRepo.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async upload(userId: string, dto: {
    imageUrl: string;
    additionalImageUrls?: string[];
    doctorName?: string;
    doctorNotes?: string;
    patientName?: string;
    prescriptionDate?: string;
  }): Promise<Prescription> {
    const prescription = this.prescriptionRepo.create({
      userId,
      imageUrl: dto.imageUrl,
      additionalImageUrls: dto.additionalImageUrls,
      doctorName: dto.doctorName,
      doctorNotes: dto.doctorNotes,
      patientName: dto.patientName,
      prescriptionDate: dto.prescriptionDate ? new Date(dto.prescriptionDate) : undefined,
      status: 'pending',
    });

    const saved = await this.prescriptionRepo.save(prescription);

    // Log compliance event
    await this.complianceService.log({
      eventType: 'prescription_uploaded',
      userId,
      prescriptionId: saved.id,
      details: `Prescription uploaded by user ${userId}`,
    });

    // Add to verification queue for async processing
    await this.verificationQueue.add('verify-prescription', {
      prescriptionId: saved.id,
      userId,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return saved;
  }

  async findByUser(userId: string) {
    return this.prescriptionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Prescription> {
    const rx = await this.prescriptionRepo.findOne({ where: { id } });
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }

  /**
   * Validate that a user has an approved, non-expired prescription
   * for the given medicine.
   */
  async validateForPurchase(userId: string, medicineId: string): Promise<Prescription | null> {
    const now = new Date();
    const rx = await this.prescriptionRepo
      .createQueryBuilder('rx')
      .where('rx.userId = :userId', { userId })
      .andWhere('rx.status = :status', { status: 'approved' })
      .andWhere('(rx.validUntil IS NULL OR rx.validUntil >= :now)', { now })
      .andWhere('rx.refillsUsed < rx.maxRefills')
      .andWhere(':medicineId = ANY(rx.medicineIds)', { medicineId })
      .orderBy('rx.createdAt', 'DESC')
      .getOne();

    return rx || null;
  }

  // ── Verification Queue (Admin/Pharmacist) ─────────────────────

  async getPendingQueue(page = 1, limit = 20) {
    const [data, total] = await this.prescriptionRepo.findAndCount({
      where: [
        { status: 'pending' },
        { status: 'consultation_requested' },
        { status: 'in_review' },
      ],
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async requestConsultation(userId: string, medicineIds: string[]): Promise<Prescription> {
    const rx = this.prescriptionRepo.create({
      userId,
      medicineIds,
      status: 'consultation_requested',
      imageUrl: 'CONSULTATION_PLACEHOLDER', // Internal flag
    });
    const saved = await this.prescriptionRepo.save(rx);

    await this.complianceService.log({
      eventType: 'consultation_requested',
      userId,
      prescriptionId: saved.id,
      details: `User requested consultation for medicines: ${medicineIds.join(', ')}`,
    });

    return saved;
  }

  async approve(
    id: string,
    reviewedBy: string,
    notes?: string,
    medicineIds?: string[],
    validUntil?: string,
    doctorName?: string,
    doctorPmdcReg?: string,
    maxRefills?: number,
    isFlagged?: boolean,
    flagReason?: string,
  ) {
    const rx = await this.findById(id);
    if (rx.status !== 'pending' && rx.status !== 'in_review' && rx.status !== 'consultation_requested') {
      throw new BadRequestException(`Cannot approve prescription in status: ${rx.status}`);
    }

    rx.status = 'approved';
    rx.reviewedBy = reviewedBy;
    rx.reviewerNotes = notes || undefined as any;
    rx.reviewedAt = new Date();
    if (medicineIds?.length) rx.medicineIds = medicineIds;
    if (validUntil) rx.validUntil = new Date(validUntil);
    if (doctorName) rx.doctorName = doctorName;
    if (doctorPmdcReg) rx.doctorPmdcReg = doctorPmdcReg;
    if (maxRefills !== undefined) rx.maxRefills = maxRefills;
    if (isFlagged !== undefined) rx.isFlagged = isFlagged;
    if (flagReason) rx.flagReason = flagReason;

    const saved = await this.prescriptionRepo.save(rx);

    await this.complianceService.log({
      eventType: 'prescription_approved',
      userId: rx.userId,
      prescriptionId: id,
      actorId: reviewedBy,
      actorType: 'admin',
      details: `Approved with ${medicineIds?.length || 0} medicines`,
    });

    // Send push notification
    try {
      const user = await this.userRepo.findOne({ where: { id: rx.userId }, select: ['id', 'fcmToken'] });
      if (user?.fcmToken) {
        await this.notificationsService.sendToUser(
          user.id,
          user.fcmToken,
          'Prescription Approved! ✅',
          'Your prescription has been approved by our pharmacist. A quotation is being prepared.',
        );
      }
    } catch (e) {
      console.error('Failed to send prescription approval notification:', e);
    }

    return saved;
  }

  async reject(id: string, reviewedBy: string, reason: string) {
    const rx = await this.findById(id);
    if (rx.status !== 'pending' && rx.status !== 'in_review' && rx.status !== 'consultation_requested') {
      throw new BadRequestException(`Cannot reject prescription in status: ${rx.status}`);
    }

    rx.status = 'rejected';
    rx.reviewedBy = reviewedBy;
    rx.rejectionReason = reason;
    rx.reviewedAt = new Date();

    const saved = await this.prescriptionRepo.save(rx);

    await this.complianceService.log({
      eventType: 'prescription_rejected',
      userId: rx.userId,
      prescriptionId: id,
      actorId: reviewedBy,
      actorType: 'admin',
      details: `Rejected: ${reason}`,
    });

    // Send push notification
    try {
      const user = await this.userRepo.findOne({ where: { id: rx.userId }, select: ['id', 'fcmToken'] });
      if (user?.fcmToken) {
        await this.notificationsService.sendToUser(
          user.id,
          user.fcmToken,
          'Prescription Rejected ❌',
          `Your prescription review was unsuccessful. Reason: ${reason}`,
        );
      }
    } catch (e) {
      console.error('Failed to send prescription rejection notification:', e);
    }

    return saved;
  }
}
