import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Commission Config — configurable commission rates per entity/vertical.
 *
 * Replaces the hardcoded 10% commission in the wallet settlement flow.
 * Supports per-vendor overrides, effective date ranges, min/max caps.
 *
 * Resolution order:
 * 1. Active config for specific entity_id (vendor/restaurant/pharmacy)
 * 2. Active config for entity_type='platform_default'
 * 3. Fallback to 10% if nothing configured
 */
@Index('IDX_COMMISSION_ENTITY', ['entityType', 'entityId'])
@Index('IDX_COMMISSION_ACTIVE', ['isActive', 'effectiveFrom'])
@Entity('commission_configs')
export class CommissionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: ['vendor', 'restaurant', 'pharmacy', 'platform_default'],
  })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string; // null = applies globally for this entityType

  @Column('decimal', { name: 'commission_percent', precision: 5, scale: 2, default: 10.0 })
  commissionPercent: number;

  @Column('decimal', { name: 'min_commission', precision: 10, scale: 2, default: 0 })
  minCommission: number; // Floor: minimum commission per order

  @Column('decimal', { name: 'max_commission', precision: 10, scale: 2, default: 0 })
  maxCommission: number; // Cap: max commission per order (0 = no cap)

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date; // null = currently active

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
