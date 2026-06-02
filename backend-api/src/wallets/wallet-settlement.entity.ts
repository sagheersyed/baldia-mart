import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wallet_settlements')
export class WalletSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('UQ_WALLET_SETTLEMENTS_ORDER_ID', { unique: true })
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

