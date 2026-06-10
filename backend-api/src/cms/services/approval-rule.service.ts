import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRule } from '../entities/approval-rule.entity';

export interface PatchOperation {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: any;
  oldValue?: any;
}

/**
 * Rule evaluation engine — determines if a change request should be
 * auto-approved or routed for manual admin review.
 *
 * Default stance: if no rule matches a field, require moderation (secure by default).
 */
@Injectable()
export class ApprovalRuleService {
  private readonly logger = new Logger(ApprovalRuleService.name);

  constructor(
    @InjectRepository(ApprovalRule)
    private readonly ruleRepo: Repository<ApprovalRule>,
  ) {}

  /**
   * Evaluate a set of JSON patch operations against the configured rules.
   * @returns true if manual moderation is required, false if auto-approval is safe.
   */
  async requiresModeration(
    entityType: string,
    patchOps: PatchOperation[],
  ): Promise<{ requiresModeration: boolean; reasons: string[] }> {
    const rules = await this.ruleRepo.find({
      where: { entityType, isActive: true },
    });

    // Check for wildcard rules first (e.g. PharmacyMedicine.* → always_moderate)
    const wildcardRule = rules.find(r => r.fieldName === '*');
    if (wildcardRule?.ruleType === 'always_moderate') {
      return {
        requiresModeration: true,
        reasons: [`All changes to ${entityType} require moderation.`],
      };
    }

    const reasons: string[] = [];

    for (const op of patchOps) {
      const field = op.path.replace(/^\//, '');
      const rule = rules.find(r => r.fieldName === field);

      if (!rule) {
        // Secure by default: unknown fields require moderation
        reasons.push(`Field '${field}' has no approval rule configured.`);
        continue;
      }

      switch (rule.ruleType) {
        case 'always_approve':
          // This field is safe, skip it
          break;

        case 'always_moderate':
          reasons.push(`Field '${field}' always requires admin review.`);
          break;

        case 'percentage_change': {
          const oldVal = Number(op.oldValue);
          const newVal = Number(op.value);
          if (isNaN(oldVal) || oldVal === 0) {
            reasons.push(`Cannot compute percentage change for '${field}' (old value missing or zero).`);
            break;
          }
          const pctDiff = Math.abs((newVal - oldVal) / oldVal) * 100;
          const maxPct = rule.ruleValue?.max_increase_percent ?? 10;
          if (pctDiff > maxPct) {
            reasons.push(
              `Field '${field}' changed by ${pctDiff.toFixed(1)}% (threshold: ${maxPct}%).`,
            );
          }
          break;
        }

        case 'value_range': {
          const val = Number(op.value);
          const min = rule.ruleValue?.min;
          const max = rule.ruleValue?.max;
          if ((min !== undefined && val < min) || (max !== undefined && val > max)) {
            reasons.push(
              `Field '${field}' value ${val} is outside allowed range [${min ?? '-∞'}, ${max ?? '+∞'}].`,
            );
          }
          break;
        }

        default:
          reasons.push(`Unknown rule type '${rule.ruleType}' for field '${field}'.`);
      }
    }

    return {
      requiresModeration: reasons.length > 0,
      reasons,
    };
  }

  // ── CRUD for admin management ──────────────────────────────────

  async findAll(): Promise<ApprovalRule[]> {
    return this.ruleRepo.find({ order: { entityType: 'ASC', fieldName: 'ASC' } });
  }

  async create(data: Partial<ApprovalRule>): Promise<ApprovalRule> {
    return this.ruleRepo.save(this.ruleRepo.create(data));
  }

  async update(id: string, data: Partial<ApprovalRule>): Promise<ApprovalRule> {
    await this.ruleRepo.update(id, data);
    return this.ruleRepo.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.ruleRepo.delete(id);
  }
}
