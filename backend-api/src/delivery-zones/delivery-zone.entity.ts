import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { name: 'center_lat', precision: 10, scale: 8 })
  centerLat: number;

  @Column('decimal', { name: 'center_lng', precision: 11, scale: 8 })
  centerLng: number;

  @Column('decimal', { name: 'radius_km', precision: 5, scale: 2 })
  radiusKm: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
