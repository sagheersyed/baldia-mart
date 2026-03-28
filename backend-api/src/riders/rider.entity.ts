import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('riders')
export class Rider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'firebase_uid', unique: true, nullable: true })
  firebaseUid: string;

  @Column({ name: 'fcm_token', nullable: true })
  fcmToken: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ name: 'phone_number', unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  mpin?: string;

  @Column({ name: 'mpin_attempts', default: 0 })
  mpinAttempts: number;

  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType: string;

  @Column({ name: 'vehicle_number', nullable: true })
  vehicleNumber: string;

  @Column({ name: 'cnic_front_url', nullable: true })
  cnicFrontUrl: string;

  @Column({ name: 'cnic_back_url', nullable: true })
  cnicBackUrl: string;

  @Column({ name: 'selfie_url', nullable: true })
  selfieUrl: string;

  @Column({ name: 'is_profile_complete', default: false })
  isProfileComplete: boolean;

  @Index()
  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column('decimal', { name: 'current_lat', precision: 10, scale: 8, nullable: true })
  currentLat: number;

  @Column('decimal', { name: 'current_lng', precision: 11, scale: 8, nullable: true })
  currentLng: number;

  @Column('decimal', { name: 'total_earnings', precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @Column('decimal', { name: 'lifetime_commission', precision: 10, scale: 2, default: 0 })
  lifetimeCommission: number;

  @Column('decimal', { name: 'performance_bonus', precision: 10, scale: 2, default: 0 })
  performanceBonus: number;

  @Column('decimal', { name: 'average_rating', precision: 3, scale: 2, default: 5.0 })
  averageRating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Index()
  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
