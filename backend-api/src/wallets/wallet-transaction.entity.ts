import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { Order } from '../orders/order.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['CREDIT', 'DEBIT'] })
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string; // The admin who performed the manual settlement

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string; // Receipt or bank transfer reference

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string; // Screenshot of payment proof

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
