import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prescription } from './prescription.entity';
import { ComplianceService } from '../compliance/compliance.service';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectQueue('prescription-verification')
    private readonly verificationQueue: Queue,
    private readonly complianceService: ComplianceService,
  ) {}

  /**
   * Upload a new prescription — enters the verification queue automatically.
   */
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
      where: { status: 'pending' },
      relations: ['user'],
      order: { createdAt: 'ASC' }, // FIFO
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async approve(id: string, reviewedBy: string, notes?: string, medicineIds?: string[], validUntil?: string) {
    const rx = await this.findById(id);
    if (rx.status !== 'pending' && rx.status !== 'in_review') {
      throw new BadRequestException(`Cannot approve prescription in status: ${rx.status}`);
    }

    rx.status = 'approved';
    rx.reviewedBy = reviewedBy;
    rx.reviewerNotes = notes || undefined as any;
    rx.reviewedAt = new Date();
    if (medicineIds?.length) rx.medicineIds = medicineIds;
    if (validUntil) rx.validUntil = new Date(validUntil);

    const saved = await this.prescriptionRepo.save(rx);

    await this.complianceService.log({
      eventType: 'prescription_approved',
      userId: rx.userId,
      prescriptionId: id,
      actorId: reviewedBy,
      actorType: 'admin',
      details: `Approved with ${medicineIds?.length || 0} medicines`,
    });

    return saved;
  }

  async reject(id: string, reviewedBy: string, reason: string) {
    const rx = await this.findById(id);
    if (rx.status !== 'pending' && rx.status !== 'in_review') {
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

    return saved;
  }
}
