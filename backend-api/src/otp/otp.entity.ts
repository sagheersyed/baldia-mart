import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index
} from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ name: 'otp_hash' })
  otpHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @Column({ name: 'attempts', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
