import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Brand } from '../brands/brand.entity';

@Entity('business_reviews')
@Index(['orderId', 'restaurantId'], { unique: true, where: '"restaurant_id" IS NOT NULL' })
@Index(['orderId', 'brandId'], { unique: true, where: '"brand_id" IS NOT NULL' })
export class BusinessReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'sub_order_id', nullable: true })
  subOrderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'restaurant_id', nullable: true })
  restaurantId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'business_type', default: 'restaurant' })
  businessType: string; // 'restaurant' | 'brand'

  @Column('int')
  rating: number; // 1 to 5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
