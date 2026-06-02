import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** jazzcash | easypaisa | cod */
  @Column({ name: 'provider' })
  provider: string;

  /** Provider's unique transaction reference */
  @Column({ name: 'provider_txn_id', nullable: true })
  providerTxnId: string;

  /** Our own unique reference sent to the provider */
  @Index({ unique: true })
  @Column({ name: 'merchant_ref', unique: true })
  merchantRef: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'PKR' })
  currency: string;

  /** pending | paid | failed | expired | refunded */
  @Column({ default: 'pending' })
  status: string;

  /** Provider response code (e.g. "000" = success for JazzCash) */
  @Column({ name: 'response_code', nullable: true })
  responseCode: string;

  /** Provider response message */
  @Column({ name: 'response_message', type: 'text', nullable: true })
  responseMessage: string;

  /** Full redirect URL sent to the provider */
  @Column({ name: 'checkout_url', type: 'text', nullable: true })
  checkoutUrl: string;

  /** Raw provider callback payload for audit */
  @Column({ name: 'callback_payload', type: 'jsonb', nullable: true })
  callbackPayload: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
