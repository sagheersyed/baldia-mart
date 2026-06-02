import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique } from 'typeorm';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('wallets')
@Unique(['userId', 'userType'])  // Prevent duplicate wallets for same user via race condition
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_type', type: 'enum', enum: ['Rider', 'Vendor', 'User'] })
  userType: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string; // The ID of the Rider, Vendor, or User

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  balance: number;

  @OneToMany(() => WalletTransaction, transaction => transaction.wallet)
  transactions: WalletTransaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
