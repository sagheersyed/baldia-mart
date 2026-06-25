import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique, Index } from 'typeorm';
import { FinancialLedgerEntry } from '../finance/entities/financial-ledger-entry.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('wallets')
@Unique(['userId', 'userType'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_type', type: 'enum', enum: ['Rider', 'Vendor', 'User', 'System'] })
  userType: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  balance: number; // Withdraw-able or usable balance (Earnings for vendors/riders)

  @Column('decimal', { name: 'cash_in_hand', precision: 12, scale: 2, default: 0 })
  cashInHand: number; // Physical cash held by Rider that belongs to platform/vendors

  @Column({ name: 'is_suspended', default: false })
  isSuspended: boolean; // Automatical suspension if cashInHand exceeds threshold

  @OneToMany(() => FinancialLedgerEntry, entry => entry.wallet)
  ledgerEntries: FinancialLedgerEntry[];

  @OneToMany(() => WalletTransaction, tx => tx.wallet)
  transactions: WalletTransaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
