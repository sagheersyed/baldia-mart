import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Medicine } from '../medicines/medicine.entity';

/**
 * Recurring/scheduled medicine delivery — supports daily, weekly, monthly
 * auto-reorder with pause/resume, reminder notifications, and adherence tracking.
 */
@Index('IDX_RECURRING_USER', ['userId'])
@Index('IDX_RECURRING_STATUS', ['status'])
@Index('IDX_RECURRING_NEXT_DATE', ['nextDeliveryDate'])
@Entity('pharma_recurring_orders')
export class PharmaRecurringOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'medicine_id' })
  medicineId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  // ── Schedule ──────────────────────────────────────────────────

  @Column({ name: 'frequency' })
  frequency: string; // 'daily', 'weekly', 'monthly'

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'preferred_pharmacy_id', nullable: true })
  preferredPharmacyId: string;

  @Column({ name: 'address_id', nullable: true })
  addressId: string;

  // ── Delivery Dates ────────────────────────────────────────────

  @Column({ name: 'next_delivery_date', type: 'date', nullable: true })
  nextDeliveryDate: Date;

  @Column({ name: 'last_delivery_date', type: 'date', nullable: true })
  lastDeliveryDate: Date;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date; // null = indefinite

  // ── Status ────────────────────────────────────────────────────

  @Column({ default: 'active' })
  status: string; // active, paused, cancelled, completed

  @Column({ name: 'pause_reason', type: 'text', nullable: true })
  pauseReason: string;

  // ── Linked Prescription ───────────────────────────────────────

  @Column({ name: 'prescription_id', nullable: true })
  prescriptionId: string; // For prescription-required recurring

  // ── Adherence Tracking ────────────────────────────────────────

  @Column({ name: 'total_deliveries', type: 'int', default: 0 })
  totalDeliveries: number;

  @Column({ name: 'missed_deliveries', type: 'int', default: 0 })
  missedDeliveries: number;

  // ── Payment ───────────────────────────────────────────────────

  @Column({ name: 'payment_method', default: 'cod' })
  paymentMethod: string; // cod, online, wallet

  // ── Timestamps ────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
