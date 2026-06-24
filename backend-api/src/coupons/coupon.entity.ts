import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.FIXED,
  })
  discount_type: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_discount_amount: number; // Cap for percentage discounts

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_order_value: number;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'int', default: 0 })
  usage_limit: number; // Global maximum uses

  @Column({ type: 'int', default: 0 })
  used_count: number; // Current total uses

  @Column({ type: 'int', default: 1 })
  user_limit: number; // Max uses per individual user

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  eligible_vendors: string[]; // List of specific vendor/restaurant IDs

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
