import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChangeRequest } from '../entities/change-request.entity';
import { ChangeRequestDiscussion } from '../entities/change-request-discussion.entity';
import { AuditService } from './audit.service';

/**
 * Change Request CRUD & lifecycle management.
 * Handles creation, submission, admin review, and status transitions.
 */
@Injectable()
export class ChangeRequestService {
  private readonly logger = new Logger(ChangeRequestService.name);

  constructor(
    @InjectRepository(ChangeRequest)
    private readonly crRepo: Repository<ChangeRequest>,
    @InjectRepository(ChangeRequestDiscussion)
    private readonly discussionRepo: Repository<ChangeRequestDiscussion>,
    @InjectQueue('cms-moderation')
    private readonly moderationQueue: Queue,
    private readonly auditService: AuditService,
  ) {}

  // ── Merchant operations ──────────────────────────────────────

  /** Create a new change request as draft or directly submit. */
  async create(params: {
    tenantId: string;
    entityType: string;
    entityId?: string;
    actionType: string;
    patchData: any;
    preChangeSnapshot?: any;
    entityVersion?: number;
    requestedBy: string;
    submitImmediately?: boolean;
  }): Promise<ChangeRequest> {
    // ── Duplicate Prevention Logic ──
    // Only check for submitted/under_review. Drafts are allowed to coexist.
    if (params.submitImmediately) {
      const existing = await this.crRepo.findOne({
        where: {
          tenantId: params.tenantId,
          entityType: params.entityType,
          entityId: params.entityId,
          actionType: params.actionType,
          status: In(['submitted', 'under_review']),
        }
      });

      // If it's an UPDATE, check if the patch fields are the same
      if (existing && params.actionType === 'UPDATE') {
        const existingPaths = Array.isArray(existing.patchData) ? existing.patchData.map(p => p.path) : [];
        const newPaths = Array.isArray(params.patchData) ? params.patchData.map(p => p.path) : [];
        
        const hasOverlap = newPaths.some(path => existingPaths.includes(path));
        if (hasOverlap) {
          this.logger.warn(`Rejected duplicate CR for ${params.entityType} ${params.entityId}`);
          throw new BadRequestException('A pending change request for this field already exists.');
        }
      } else if (existing && params.actionType === 'CREATE') {
         // For CREATE, we check if the patchData matches (basic check)
         if (JSON.stringify(existing.patchData) === JSON.stringify(params.patchData)) {
            throw new BadRequestException('An identical request is already pending review.');
         }
      }
    }

    const cr = this.crRepo.create({
      tenantId: params.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      actionType: params.actionType,
      patchData: params.patchData,
      preChangeSnapshot: params.preChangeSnapshot,
      entityVersion: params.entityVersion,
      requestedBy: params.requestedBy,
      status: params.submitImmediately ? 'submitted' : 'draft',
    });

    const saved = await this.crRepo.save(cr).catch(err => {
      if (err.code === '23505') { // Unique violation
        throw new BadRequestException('A similar request already exists.');
      }
      throw err;
    });

    await this.auditService.log({
      tenantId: params.tenantId,
      userId: params.requestedBy,
      action: `change_request.${params.submitImmediately ? 'submitted' : 'created'}`,
      description: `${params.actionType} ${params.entityType}${params.entityId ? ` (${params.entityId})` : ''}`,
      changeRequestId: saved.id,
      payload: { entityType: params.entityType, actionType: params.actionType },
    });

    // If submitted, enqueue for moderation evaluation
    if (params.submitImmediately) {
      await this.moderationQueue.add('evaluate', { changeRequestId: saved.id });
    }

    return saved;
  }

  /** Submit a draft change request for review. */
  async submit(id: string, userId: string): Promise<ChangeRequest> {
    const cr = await this.findOneOrFail(id);
    if (cr.requestedBy !== userId) {
      throw new ForbiddenException('You can only submit your own change requests.');
    }
    if (cr.status !== 'draft' && cr.status !== 'rejected') {
      throw new BadRequestException(`Cannot submit a request in '${cr.status}' status.`);
    }

    cr.status = 'submitted';
    const saved = await this.crRepo.save(cr);

    await this.auditService.log({
      tenantId: cr.tenantId,
      userId,
      action: 'change_request.submitted',
      changeRequestId: id,
    });

    // Enqueue for moderation
    await this.moderationQueue.add('evaluate', { changeRequestId: id });

    return saved;
  }

  /** List change requests for a specific tenant (merchant view). */
  async listByTenant(tenantId: string, filters?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ChangeRequest[]; total: number }> {
    const qb = this.crRepo.createQueryBuilder('cr')
      .where('cr.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('cr.requester', 'requester')
      .leftJoinAndSelect('cr.reviewer', 'reviewer')
      .orderBy('cr.createdAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('cr.status = :status', { status: filters.status });
    }
    if (filters?.entityType) {
      qb.andWhere('cr.entityType = :entityType', { entityType: filters.entityType });
    }

    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    qb.take(limit).skip(offset);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ── Admin operations ─────────────────────────────────────────

  /** Get the admin review queue (all submitted & under_review requests). */
  async getAdminQueue(filters?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ChangeRequest[]; total: number }> {
    const qb = this.crRepo.createQueryBuilder('cr')
      .leftJoinAndSelect('cr.requester', 'requester')
      .leftJoinAndSelect('cr.reviewer', 'reviewer')
      .leftJoinAndSelect('cr.tenant', 'tenant')
      .orderBy('cr.createdAt', 'DESC'); // LIFO (Newest First)

    // Map admin UI filter keys to actual DB statuses
    let statuses: string[];
    switch (filters?.status) {
      case 'pending':
        statuses = ['submitted', 'under_review'];
        break;
      case 'approved':
        statuses = ['approved', 'auto_approved', 'published'];
        break;
      case 'rejected':
        statuses = ['rejected'];
        break;
      case 'auto_approved':
        statuses = ['auto_approved'];
        break;
      case undefined:
      case '':
      case 'all':
        statuses = ['submitted', 'under_review'];
        break;
      default:
        statuses = [filters!.status!];
    }

    qb.where('cr.status IN (:...statuses)', { statuses });

    if (filters?.entityType) {
      qb.andWhere('cr.entityType = :entityType', { entityType: filters.entityType });
    }

    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    qb.take(limit).skip(offset);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** Admin claims a change request for review. */
  async claim(id: string, adminId: string): Promise<ChangeRequest> {
    const cr = await this.findOneOrFail(id);
    if (cr.status !== 'submitted' && cr.status !== 'under_review') {
      throw new BadRequestException(`Cannot claim a request in '${cr.status}' status.`);
    }

    cr.status = 'under_review';
    cr.assignedTo = adminId;
    const saved = await this.crRepo.save(cr);

    await this.auditService.log({
      tenantId: cr.tenantId,
      userId: adminId,
      action: 'change_request.claimed',
      changeRequestId: id,
    });

    return saved;
  }

  /** Admin approves a change request → triggers publish queue. */
  async approve(id: string, adminId: string): Promise<ChangeRequest> {
    const cr = await this.findOneOrFail(id);
    if (cr.status !== 'under_review' && cr.status !== 'submitted') {
      throw new BadRequestException(`Cannot approve a request in '${cr.status}' status.`);
    }

    cr.status = 'approved';
    cr.assignedTo = adminId;
    cr.reviewedAt = new Date();
    const saved = await this.crRepo.save(cr);

    await this.auditService.log({
      tenantId: cr.tenantId,
      userId: adminId,
      action: 'change_request.approved',
      changeRequestId: id,
    });

    // Enqueue for publish
    await this.moderationQueue.add('publish', { changeRequestId: id });

    return saved;
  }

  /** Admin rejects a change request with a reason. */
  async reject(id: string, adminId: string, reason: string): Promise<ChangeRequest> {
    const cr = await this.findOneOrFail(id);
    if (cr.status !== 'under_review' && cr.status !== 'submitted') {
      throw new BadRequestException(`Cannot reject a request in '${cr.status}' status.`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required.');
    }

    cr.status = 'rejected';
    cr.assignedTo = adminId;
    cr.rejectionReason = reason;
    cr.reviewedAt = new Date();
    const saved = await this.crRepo.save(cr);

    await this.auditService.log({
      tenantId: cr.tenantId,
      userId: adminId,
      action: 'change_request.rejected',
      description: reason,
      changeRequestId: id,
    });

    return saved;
  }

  // ── Discussions ──────────────────────────────────────────────

  async addDiscussion(changeRequestId: string, authorId: string, message: string) {
    const cr = await this.findOneOrFail(changeRequestId);
    const discussion = this.discussionRepo.create({
      changeRequestId,
      authorId,
      message,
    });
    return this.discussionRepo.save(discussion);
  }

  async getDiscussions(changeRequestId: string): Promise<ChangeRequestDiscussion[]> {
    return this.discussionRepo.find({
      where: { changeRequestId },
      order: { createdAt: 'ASC' },
      relations: ['author'],
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  async findOneOrFail(id: string): Promise<ChangeRequest> {
    const cr = await this.crRepo.findOne({
      where: { id },
      relations: ['tenant', 'requester', 'reviewer'],
    });
    if (!cr) throw new NotFoundException(`Change request ${id} not found.`);
    return cr;
  }

  /** Mark a change request status (used by queue processors). */
  async updateStatus(id: string, status: string, extra?: Partial<ChangeRequest>): Promise<void> {
    await this.crRepo.update(id, { status, ...extra });
  }
}
