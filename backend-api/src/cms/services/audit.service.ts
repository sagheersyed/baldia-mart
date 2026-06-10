import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

/**
 * Append-only audit logging service.
 * Records all CMS operations for compliance and fraud investigation.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    tenantId?: string;
    userId?: string;
    action: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    payload?: any;
    changeRequestId?: string;
  }): Promise<AuditLog> {
    const entry = this.auditRepo.create(params);
    return this.auditRepo.save(entry);
  }

  /** Get audit trail for a specific tenant. */
  async getByTenant(tenantId: string, limit = 50, offset = 0): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['user'],
    });
  }

  /** Get audit trail for a specific change request. */
  async getByChangeRequest(changeRequestId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { changeRequestId },
      order: { createdAt: 'ASC' },
      relations: ['user'],
    });
  }
}
