import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToMany, JoinColumn, Index,
} from 'typeorm';
import { FinancialLedgerEntry } from './financial-ledger-entry.entity';

/**
 * FinancialTransaction — Parent anchor for a set of double-entry ledger lines.
 * This ensures ACID compliance for complex splits.
 */
@Entity('financial_transactions')
export class FinancialTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reference_type' })
  referenceType: string; // 'ORDER_SETTLEMENT', 'CASH_RECONCILIATION', 'WITHDRAWAL'

  @Column({ name: 'reference_id' })
  referenceId: string; // e.g. orderId

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => FinancialLedgerEntry, entry => entry.transaction, { cascade: true })
  entries: FinancialLedgerEntry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
