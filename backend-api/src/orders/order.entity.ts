import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Address } from '../addresses/address.entity';
import { Rider } from '../riders/rider.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'rider_id', nullable: true })
  riderId: string;

  @ManyToOne(() => Rider)
  @JoinColumn({ name: 'rider_id' })
  rider: Rider;

  @Column({ name: 'address_id' })
  addressId: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @Column({ default: 'pending' })
  status: string; // pending, confirmed, out_for_delivery, delivered, cancelled

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { name: 'delivery_fee', precision: 10, scale: 2 })
  deliveryFee: number;

  @Column('decimal', { name: 'discount_amount', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ name: 'payment_method' })
  paymentMethod: string; // cod, online

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: string; // pending, paid, failed

  @Column('decimal', { name: 'delivery_distance_km', precision: 5, scale: 2, nullable: true })
  deliveryDistanceKm: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];

  @Column({ name: 'is_rated', default: false })
  isRated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
