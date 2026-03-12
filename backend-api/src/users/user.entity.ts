import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable — phone-only users have no Firebase UID
  @Column({ name: 'firebase_uid', unique: true, nullable: true })
  firebaseUid: string;

  @Column({ nullable: true })
  name: string;

  // Nullable email for phone-only users
  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ name: 'phone_number', nullable: true, unique: true })
  phoneNumber: string;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ default: 'customer' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
