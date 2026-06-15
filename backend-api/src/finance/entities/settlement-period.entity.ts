import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Wallet } from '../../wallets/wallet.entity';

/**
 * Settlement Period — formal payout cycle for vendors/riders.
 *
 * Tracks a time window (typically weekly) with computed aggregates:
 * gross sales, commission deducted, refunds, and the net amount payable.
 *
 * Status flow: OPEN → CLOSED → PROCESSING → PAID
 * - OPEN: Period still accepting new orders
 * - CLOSED: Period ended, amounts computed, pending admin action
 * - PROCESSING: Admin initiated payout (bank transfer in progress)
 * - PAID: Payout completed, reference ID recorded
 * - DISPUTED: Vendor raised a dispute on amounts
 */
@Index('IDX_SETTLEMENT_WALLET_STATUS', ['walletId', 'status'])
@Index('IDX_SETTLEMENT_PERIOD_DATES', ['periodStart', 'periodEnd'])
@Unique('UQ_SETTLEMENT_WALLET_PERIOD', ['walletId', 'periodStart', 'periodEnd'])
@Entity('settlement_periods')
export class SettlementPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  // ── Aggregated Financials ─────────────────────────────────────

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number;

  @Column('decimal', { name: 'gross_sales', precision: 12, scale: 2, default: 0 })
  grossSales: number;

  @Column('decimal', { name: 'commission_deducted', precision: 12, scale: 2, default: 0 })
  commissionDeducted: number;

  @Column('decimal', { name: 'delivery_fees_earned', precision: 12, scale: 2, default: 0 })
  deliveryFeesEarned: number;

  @Column('decimal', { name: 'bonuses_earned', precision: 12, scale: 2, default: 0 })
  bonusesEarned: number;

  @Column('decimal', { name: 'refunds_issued', precision: 12, scale: 2, default: 0 })
  refundsIssued: number;

  @Column('decimal', { name: 'adjustments', precision: 12, scale: 2, default: 0 })
  adjustments: number;

  @Column('decimal', { name: 'net_payout', precision: 12, scale: 2, default: 0 })
  netPayout: number;

  // ── Settlement Status ─────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['OPEN', 'CLOSED', 'PROCESSING', 'PAID', 'DISPUTED'],
    default: 'OPEN',
  })
  status: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'payment_reference', nullable: true })
  paymentReference: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string; // bank_transfer, jazzcash, easypaisa, cash

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
