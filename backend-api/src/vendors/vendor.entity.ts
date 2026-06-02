import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { VendorProduct } from './vendor-product.entity';
import { DeliveryZone } from '../delivery-zones/delivery-zone.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @ManyToOne(() => DeliveryZone)
  @JoinColumn({ name: 'zone_id' })
  zone: DeliveryZone;

  @Column()
  name: string;

  @Column({ nullable: true })
  type: string; // grocery, dairy, vegetable, pharmacy, bakery, etc.

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  location: string; // e.g. "Main Colony, Baldia Town"

  @Column('decimal', { name: 'lat', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column('decimal', { name: 'lng', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column('decimal', { name: 'average_rating', precision: 3, scale: 2, default: 5.0 })
  averageRating: number;

  @Column({ name: 'radius_km', type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  radiusKm: number;

  @Index()
  @Column({ name: 'is_open', default: true })
  isOpen: boolean;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'opening_hours', nullable: true })
  openingHours: string; // e.g. "09:00 AM - 11:00 PM"

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string; // e.g. "09:00"

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string; // e.g. "23:00"

  @OneToMany(() => VendorProduct, vp => vp.vendor)
  vendorProducts: VendorProduct[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
