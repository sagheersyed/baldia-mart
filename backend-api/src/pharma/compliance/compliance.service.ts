import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmaComplianceLog } from './pharma-compliance-log.entity';

/**
 * ComplianceService — append-only audit logger for healthcare regulatory events.
 * Every prescription action, controlled substance purchase attempt, age restriction,
 * and expiry block is logged for traceability.
 */
@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(PharmaComplianceLog)
    private readonly logRepo: Repository<PharmaComplianceLog>,
  ) {}

  async log(data: {
    eventType: string;
    userId?: string;
    orderId?: string;
    medicineId?: string;
    pharmacyId?: string;
    prescriptionId?: string;
    actorId?: string;
    actorType?: string;
    details?: string;
    severity?: string;
  }): Promise<PharmaComplianceLog> {
    const entry = this.logRepo.create({
      ...data,
      severity: data.severity || 'info',
    });
    return this.logRepo.save(entry);
  }

  async getByOrder(orderId: string) {
    return this.logRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async getByUser(userId: string, page = 1, limit = 50) {
    const [data, total] = await this.logRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getByEventType(eventType: string, page = 1, limit = 50) {
    const [data, total] = await this.logRepo.findAndCount({
      where: { eventType },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getCriticalAlerts(page = 1, limit = 50) {
    const [data, total] = await this.logRepo.findAndCount({
      where: { severity: 'critical' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getAll(page = 1, limit = 50) {
    const [data, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getByPrescription(prescriptionId: string, page = 1, limit = 50) {
    const [data, total] = await this.logRepo.findAndCount({
      where: { prescriptionId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getStats() {
    const qb = this.logRepo.createQueryBuilder('log');

    const [totalLogs, criticalCount, eventBreakdown, recentCritical] = await Promise.all([
      qb.getCount(),

      this.logRepo.count({ where: { severity: 'critical' } }),

      this.logRepo.createQueryBuilder('l')
        .select('l.eventType', 'eventType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('l.eventType')
        .orderBy('count', 'DESC')
        .getRawMany(),

      this.logRepo.find({
        where: { severity: 'critical' },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      totalLogs,
      criticalCount,
      eventBreakdown: eventBreakdown.map((e: any) => ({
        eventType: e.eventType,
        count: Number(e.count),
      })),
      recentCritical,
    };
  }
}
