import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Database-driven approval rules that determine whether a change request
 * should be auto-approved or routed for manual admin review.
 *
 * Rule types:
 *   'always_approve'     – auto-approve any change to this field
 *   'always_moderate'    – always require admin review
 *   'percentage_change'  – auto-approve if value change ≤ threshold %
 *   'value_range'        – auto-approve if new value is within bounds
 */
@Index('IDX_RULE_ENTITY_FIELD', ['entityType', 'fieldName'])
@Entity('approval_rules')
export class ApprovalRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string; // 'Product', 'VendorProduct', 'MenuItem', 'PharmacyMedicine', 'StoreProfile'

  @Column({ name: 'field_name', length: 50 })
  fieldName: string; // 'price', 'stock_qty', 'is_available', '*' (wildcard)

  @Column({ name: 'rule_type', length: 30 })
  ruleType: string; // 'always_approve' | 'always_moderate' | 'percentage_change' | 'value_range'

  /**
   * JSON config for the rule. Examples:
   *   { "max_increase_percent": 15 }
   *   { "min": 0, "max": 100000 }
   *   {}
   */
  @Column({ name: 'rule_value', type: 'jsonb', default: '{}' })
  ruleValue: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
