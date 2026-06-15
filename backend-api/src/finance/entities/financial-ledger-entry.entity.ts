import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Wallet } from '../../wallets/wallet.entity';
import { Order } from '../../orders/order.entity';

/**
 * Financial Ledger Entry — the core unit of the financial records system.
 *
 * Every monetary movement (order settlement, COD collection, refund, payout, etc.)
 * creates one or more ledger entries with a categorized `entryType`.
 *
 * Design:
 * - Running balance stored on each entry for O(1) balance lookups.
 * - Period key (YYYY-MM or YYYY-Www) enables fast range aggregation.
 * - Flexible JSONB metadata for vertical-specific data without schema bloat.
 */
@Index('IDX_LEDGER_WALLET_CREATED', ['walletId', 'createdAt'])
@Index('IDX_LEDGER_ORDER', ['orderId'])
@Index('IDX_LEDGER_ENTRY_TYPE', ['entryType'])
@Index('IDX_LEDGER_PERIOD_KEY', ['periodKey'])
@Index('IDX_LEDGER_WALLET_PERIOD', ['walletId', 'periodKey'])
@Entity('financial_ledger_entries')
export class FinancialLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Foreign Keys ──────────────────────────────────────────────

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // ── Entry Classification ──────────────────────────────────────

  @Column({
    name: 'entry_type',
    type: 'enum',
    enum: [
      'ORDER_SUBTOTAL',
      'DELIVERY_FEE',
      'PLATFORM_COMMISSION',
      'VENDOR_PAYOUT',
      'RIDER_DELIVERY_FEE',
      'RIDER_BONUS',
      'RIDER_TIP',
      'COD_COLLECTION',
      'COD_REMITTANCE',
      'WITHDRAWAL',
      'MANUAL_ADJUSTMENT',
      'REFUND',
      'DISCOUNT_SUBSIDY',
      'TAX_DEDUCTION',
    ],
  })
  entryType: string;

  @Column({
    type: 'enum',
    enum: ['CREDIT', 'DEBIT'],
  })
  direction: string;

  // ── Monetary Values ───────────────────────────────────────────

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { name: 'running_balance', precision: 12, scale: 2, default: 0 })
  runningBalance: number;

  @Column({ default: 'PKR' })
  currency: string;

  // ── Descriptive Fields ────────────────────────────────────────

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // ── Time Grouping ─────────────────────────────────────────────

  @Column({ name: 'period_key', length: 10 })
  periodKey: string; // 'YYYY-MM' for monthly, enables fast GROUP BY

  // ── Audit ─────────────────────────────────────────────────────

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
