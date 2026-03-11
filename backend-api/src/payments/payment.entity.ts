import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'stripe_payment_intent_id', nullable: true })
  stripePaymentIntentId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column()
  status: string; // pending, succeeded, failed

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
