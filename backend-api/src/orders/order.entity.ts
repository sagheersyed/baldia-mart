import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Address } from '../addresses/address.entity';
import { Rider } from '../riders/rider.entity';
import { OrderItem } from './order-item.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { SubOrder } from './sub-order.entity';
import { Brand } from '../brands/brand.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'rider_id', nullable: true })
  riderId: string;

  @ManyToOne(() => Rider)
  @JoinColumn({ name: 'rider_id' })
  rider: Rider;

  @Column({ name: 'address_id', nullable: true })
  addressId: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @Column({ name: 'mart_id', nullable: true })
  martId: string;

  @Column({ name: 'restaurant_id', nullable: true })
  restaurantId: string;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Index()
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

  @Column('decimal', { name: 'rider_commission', precision: 10, scale: 2, default: 0 })
  riderCommission: number;

  @Column('decimal', { name: 'delivery_distance_km', precision: 5, scale: 2, nullable: true })
  deliveryDistanceKm: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'order_type', default: 'mart' })
  orderType: string; // mart, food, rashan

  // ── Monthly Rashan Bulk Order Fields ──────────────────────────────────────
  @Column({ name: 'bulk_list_text', type: 'text', nullable: true })
  bulkListText: string;

  @Column({ name: 'bulk_list_photo_url', nullable: true })
  bulkListPhotoUrl: string;

  @Column({ name: 'bulk_mobile_number', nullable: true })
  bulkMobileNumber: string;

  @Column({ name: 'bulk_street_address', nullable: true })
  bulkStreetAddress: string;

  @Column({ name: 'bulk_city', nullable: true })
  bulkCity: string;

  @Column({ name: 'bulk_landmark', nullable: true })
  bulkLandmark: string;

  @Column({ name: 'bulk_floor', type: 'int', nullable: true })
  bulkFloor: number;

  @Column({ name: 'bulk_placement', nullable: true })
  bulkPlacement: string; // gate, doorstep, inside

  @Column({ name: 'bulk_weight_tier', nullable: true })
  bulkWeightTier: string; // light (<20kg), medium (20-50kg), heavy (50kg+)

  @Column({ name: 'bulk_additional_notes', type: 'text', nullable: true })
  bulkAdditionalNotes: string;

  @Column({ name: 'rashan_status', default: 'pending_review' })
  rashanStatus: string; // pending_review, quoted, approved, sourcing, delivered, rejected

  @Column({ name: 'estimated_total', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedTotal: number;

  @Column({ name: 'is_estimate_approved', default: false })
  isEstimateApproved: boolean;

  @Column({ name: 'admin_rejection_reason', type: 'text', nullable: true })
  adminRejectionReason: string;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];

  @OneToMany(() => SubOrder, subOrder => subOrder.order)
  subOrders: SubOrder[];

  @Column({ name: 'is_rated', default: false })
  isRated: boolean;

  @Column({ name: 'is_business_rated', default: false })
  isBusinessRated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
