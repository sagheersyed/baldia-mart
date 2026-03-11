import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('riders')
export class Rider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'firebase_uid', unique: true })
  firebaseUid: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType: string;

  @Column({ name: 'vehicle_number', nullable: true })
  vehicleNumber: string;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column('decimal', { name: 'current_lat', precision: 10, scale: 8, nullable: true })
  currentLat: number;

  @Column('decimal', { name: 'current_lng', precision: 11, scale: 8, nullable: true })
  currentLng: number;

  @Column('decimal', { name: 'total_earnings', precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
