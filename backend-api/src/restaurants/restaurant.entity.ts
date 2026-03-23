import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MenuItem } from '../menu-items/menu-item.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'cuisine_type', nullable: true })
  cuisineType: string; // e.g., 'Pakistani', 'Fast Food', 'BBQ'

  @Column({ name: 'opening_hours', nullable: true })
  openingHours: string; // e.g., '9:00 AM - 11:00 PM'

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string; // e.g., '09:00'

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string; // e.g., '23:00'

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating: number;

  @OneToMany(() => MenuItem, item => item.restaurant)
  menuItems: MenuItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
