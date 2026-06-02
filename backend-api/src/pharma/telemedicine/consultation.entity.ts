import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Doctor } from './doctor.entity';
import { Clinic } from './clinic.entity';

export type ConsultationStatus = 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type ConsultationType = 'video' | 'physical';

@Index('IDX_CONSULTATION_USER', ['userId'])
@Index('IDX_CONSULTATION_DOCTOR', ['doctorId'])
@Index('IDX_CONSULTATION_STATUS', ['status'])
@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => Doctor, doctor => doctor.consultations)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'clinic_id', nullable: true })
  clinicId: string;

  @ManyToOne(() => Clinic, clinic => clinic.consultations)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({
    type: 'enum',
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  })
  status: ConsultationStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', default: 15 })
  durationMinutes: number;

  @Column({ name: 'video_room_id', nullable: true })
  videoRoomId: string; // ID for Jitsi/Agora room

  @Column({ name: 'prescription_id', nullable: true })
  prescriptionId: string; // Link to prescription if issued

  @Column({
    type: 'enum',
    enum: ['video', 'physical'],
    default: 'video'
  })
  visitType: ConsultationType;

  @Column({ name: 'meeting_url', nullable: true })
  meetingUrl: string; // Zoom/Google Meet link for video calls

  @Column({ name: 'fee_paid', type: 'decimal', precision: 10, scale: 2 })
  feePaid: number;

  @Column({ name: 'availability_id', nullable: true })
  availabilityId: string;

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: string;

  @Column({ name: 'payment_method', default: 'wallet' })
  paymentMethod: string;

  @Column({ type: 'text', nullable: true })
  userNotes: string;

  @Column({ type: 'text', nullable: true })
  doctorSummary: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
