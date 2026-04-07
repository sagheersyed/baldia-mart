import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from '../restaurants/restaurant.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, restaurant => restaurant.menuItems)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { default: 0, precision: 10, scale: 2 })
  discount: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  category: string; // e.g., 'Biryani', 'BBQ', 'Rolls'

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'prep_time_minutes', nullable: true })
  prepTimeMinutes: number;

  @Column({ name: 'max_quantity_per_order', default: 0 })
  maxQuantityPerOrder: number;

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string; // e.g., '09:00'

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string; // e.g., '23:00'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
