import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeRequest } from '../entities/change-request.entity';
import { ApprovalRuleService, PatchOperation } from '../services/approval-rule.service';
import { MergeService } from '../services/merge.service';
import { AuditService } from '../services/audit.service';

/**
 * BullMQ worker for CMS moderation and publishing.
 *
 * Handles two job types:
 *   1. 'evaluate' — runs auto-approval rule checks on submitted change requests.
 *   2. 'publish'  — applies approved patches to production tables.
 */
@Processor('cms-moderation', { concurrency: 3 })
export class CmsModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(CmsModerationProcessor.name);

  constructor(
    @InjectRepository(ChangeRequest)
    private readonly crRepo: Repository<ChangeRequest>,
    private readonly ruleService: ApprovalRuleService,
    private readonly mergeService: MergeService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'evaluate':
        return this.handleEvaluate(job);
      case 'publish':
        return this.handlePublish(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Evaluate a submitted change request against auto-approval rules.
   * If all fields pass, auto-approve and immediately publish.
   * If any field fails, leave in 'submitted' state for admin review.
   */
  private async handleEvaluate(job: Job): Promise<void> {
    const { changeRequestId } = job.data;
    const cr = await this.crRepo.findOne({
      where: { id: changeRequestId },
      relations: ['tenant'],
    });

    if (!cr || cr.status !== 'submitted') {
      this.logger.warn(`CR ${changeRequestId} not found or not in 'submitted' state. Skipping.`);
      return;
    }

    this.logger.log(`Evaluating CR ${cr.id} (${cr.entityType}.${cr.actionType})`);

    // For CREATE actions, we typically require moderation (new content)
    if (cr.actionType === 'CREATE') {
      this.logger.log(`CR ${cr.id} is a CREATE action — requires manual review.`);
      return; // Leave as 'submitted'
    }

    // For DELETE actions, always require moderation
    if (cr.actionType === 'DELETE') {
      this.logger.log(`CR ${cr.id} is a DELETE action — requires manual review.`);
      return;
    }

    // For UPDATE actions, check each patch operation
    const patches: PatchOperation[] = Array.isArray(cr.patchData) ? cr.patchData : [];
    if (patches.length === 0) {
      this.logger.warn(`CR ${cr.id} has no patch operations. Skipping.`);
      return;
    }

    const result = await this.ruleService.requiresModeration(cr.entityType, patches);

    if (!result.requiresModeration) {
      // Auto-approve and publish immediately
      this.logger.log(`CR ${cr.id} auto-approved. Publishing...`);

      await this.crRepo.update(cr.id, {
        status: 'auto_approved',
        reviewedAt: new Date(),
      });

      await this.auditService.log({
        tenantId: cr.tenantId,
        action: 'change_request.auto_approved',
        changeRequestId: cr.id,
        payload: { reasons: ['All changes within safe thresholds.'] },
      });

      // Publish immediately
      await this.publish(cr);
    } else {
      this.logger.log(
        `CR ${cr.id} requires manual review. Reasons: ${result.reasons.join('; ')}`,
      );

      await this.auditService.log({
        tenantId: cr.tenantId,
        action: 'change_request.moderation_required',
        changeRequestId: cr.id,
        payload: { reasons: result.reasons },
      });
    }
  }

  /**
   * Apply an approved change request to the production database.
   */
  private async handlePublish(job: Job): Promise<void> {
    const { changeRequestId } = job.data;
    const cr = await this.crRepo.findOne({
      where: { id: changeRequestId },
      relations: ['tenant'],
    });

    if (!cr) {
      this.logger.warn(`CR ${changeRequestId} not found. Skipping publish.`);
      return;
    }

    if (cr.status !== 'approved' && cr.status !== 'auto_approved') {
      this.logger.warn(`CR ${cr.id} is in '${cr.status}' state — cannot publish. Skipping.`);
      return;
    }

    await this.publish(cr);
  }

  /** Shared publish logic. */
  private async publish(cr: ChangeRequest): Promise<void> {
    await this.crRepo.update(cr.id, { status: 'merging' });

    const result = await this.mergeService.applyChangeRequest(cr);

    if (result.success) {
      await this.crRepo.update(cr.id, {
        status: 'published',
        publishedAt: new Date(),
      });

      await this.auditService.log({
        tenantId: cr.tenantId,
        userId: cr.requestedBy,
        action: 'change_request.published',
        changeRequestId: cr.id,
      });

      this.logger.log(`CR ${cr.id} published successfully.`);
    } else {
      await this.crRepo.update(cr.id, {
        status: 'failed',
        rejectionReason: `Merge failed: ${result.error}`,
      });

      this.logger.error(`CR ${cr.id} merge failed: ${result.error}`);
    }
  }
}
