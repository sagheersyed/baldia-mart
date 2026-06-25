import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Wallet } from '../../wallets/wallet.entity';
import { FinancialTransaction } from './financial-transaction.entity';

/**
 * Financial Ledger Entry — Immutable accounting lines.
 * Follows Double-Entry: Every Transaction must have equal Debits and Credits.
 */
@Index('IDX_LEDGER_TX_ID', ['transactionId'])
@Index('IDX_LEDGER_WALLET_ID', ['walletId'])
@Index('IDX_LEDGER_ACCOUNT_TAG', ['accountTag'])
@Entity('financial_ledger_entries')
export class FinancialLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @ManyToOne(() => FinancialTransaction, tx => tx.entries)
  @JoinColumn({ name: 'transaction_id' })
  transaction: FinancialTransaction;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId: string; // The specific rider/vendor wallet (if applicable)

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({
    name: 'account_tag',
    type: 'enum',
    enum: [
      'EARNINGS',      // Withdraw-able balance
      'CASH_IN_HAND',  // Physical cash held (Riders)
      'PLATFORM_REV',  // Platform revenue account
      'TAX_PAYABLE',   // Government tax account
      'VOUCHER_EXP',   // Promotion expenses
    ],
    default: 'EARNINGS'
  })
  accountTag: string;

  @Column({
    type: 'enum',
    enum: ['CREDIT', 'DEBIT'],
  })
  direction: 'CREDIT' | 'DEBIT'; // CREDIT increases earnings, DEBIT decreases earnings (except for CASH/ASSET accounts)

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'module_type', nullable: true })
  moduleType: string; // 'food', 'mart', 'rashan', 'pharma'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
