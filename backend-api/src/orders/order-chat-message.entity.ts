import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_chat_messages')
export class OrderChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'sender_type' })
  senderType: string; // 'user' or 'rider'

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'reply_to_id', nullable: true })
  replyToId: string;

  @ManyToOne(() => OrderChatMessage, { nullable: true })
  @JoinColumn({ name: 'reply_to_id' })
  replyTo: OrderChatMessage;

  @Column({ default: 'text' })
  type: string; // 'text', 'replacement_suggestion'

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Store product details for replacement suggestions

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
