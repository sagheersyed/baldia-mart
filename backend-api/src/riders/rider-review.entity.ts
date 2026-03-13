import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Rider } from './rider.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';

@Entity('rider_reviews')
export class RiderReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rider_id' })
  riderId: string;

  @ManyToOne(() => Rider)
  @JoinColumn({ name: 'rider_id' })
  rider: Rider;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_id', unique: true })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('int')
  rating: number; // 1 to 5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
