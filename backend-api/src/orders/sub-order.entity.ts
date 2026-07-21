import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { OrderItem } from './order-item.entity';
import { Vendor } from '../vendors/vendor.entity';
import { Pharmacy } from '../pharma/pharmacies/pharmacy.entity';

@Entity('sub_orders')
export class SubOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, order => order.subOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  // For mart (multi-vendor) orders
  @Column({ type: 'uuid', name: 'vendor_id', nullable: true })
  vendorId: string;

  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'uuid', name: 'pharmacy_id', nullable: true })
  pharmacyId: string;

  @ManyToOne(() => Pharmacy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  // Optimized pickup order (1 = first stop, 2 = second, etc.)
  @Column({ name: 'pickup_sequence', type: 'int', default: 1 })
  pickupSequence: number;

  @Column({ type: 'uuid', nullable: true })
  riderId: string;

  @Column({ default: 'pending' })
  status: string; // pending, preparing, ready, picked_up, delivered

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  /** Rider cash payment to merchant at pickup (CASH_ON_PICK mode). */
  @Column({ name: 'pickup_payment_status', default: 'pending' })
  pickupPaymentStatus: 'pending' | 'confirmed';

  @Column('decimal', { name: 'pickup_payment_amount', precision: 10, scale: 2, nullable: true })
  pickupPaymentAmount: number;

  @Column({ name: 'pickup_payment_confirmed_at', type: 'timestamp', nullable: true })
  pickupPaymentConfirmedAt: Date;

  @Column({ name: 'pickup_payment_confirmed_by', type: 'uuid', nullable: true })
  pickupPaymentConfirmedBy: string;

  @Column({ type: 'int', nullable: true })
  estimatedPrepTimeMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrderItem, item => item.subOrder, { cascade: true })
  items: OrderItem[];
}
