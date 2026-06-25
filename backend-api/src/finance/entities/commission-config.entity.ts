import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';

@Index('IDX_COMMISSION_ENTITY', ['entityType', 'entityId'])
@Index('IDX_COMMISSION_MODULE', ['moduleType'])
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

  @Column({
    name: 'module_type',
    type: 'enum',
    enum: ['food', 'mart', 'rashan', 'pharma', 'all'],
    default: 'all'
  })
  moduleType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string; // null = applies globally

  @Column('decimal', { name: 'commission_percent', precision: 5, scale: 2, default: 10.0 })
  commissionPercent: number;

  @Column('decimal', { name: 'min_commission', precision: 10, scale: 2, default: 0 })
  minCommission: number;

  @Column('decimal', { name: 'max_commission', precision: 10, scale: 2, default: 0 })
  maxCommission: number;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
