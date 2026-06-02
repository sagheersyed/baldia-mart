import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Prescription entity — stores uploaded prescriptions with verification workflow.
 * A prescription must be approved before prescription-required medicines can be purchased.
 */
@Index('IDX_PRESCRIPTION_USER', ['userId'])
@Index('IDX_PRESCRIPTION_STATUS', ['status'])
@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ── Upload ────────────────────────────────────────────────────

  @Column({ name: 'image_url' })
  imageUrl: string; // Uploaded prescription image

  @Column('simple-array', { name: 'additional_image_urls', nullable: true })
  additionalImageUrls: string[]; // Multiple pages

  @Column({ name: 'doctor_name', nullable: true })
  doctorName: string;

  @Column({ name: 'doctor_pmdc_reg', nullable: true })
  doctorPmdcReg: string;

  @Column({ name: 'doctor_notes', type: 'text', nullable: true })
  doctorNotes: string;

  @Column({ name: 'patient_name', nullable: true })
  patientName: string;

  @Column({ name: 'prescription_date', type: 'date', nullable: true })
  prescriptionDate: Date;

  // ── Verification Workflow ─────────────────────────────────────

  @Column({ default: 'pending' })
  status: string; // pending, in_review, approved, rejected, expired

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string; // Admin/Pharmacist ID who reviewed

  @Column({ name: 'reviewer_notes', type: 'text', nullable: true })
  reviewerNotes: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // ── Validity ──────────────────────────────────────────────────

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date; // Prescription validity period

  @Column({ name: 'max_refills', type: 'int', default: 1 })
  maxRefills: number;

  @Column({ name: 'refills_used', type: 'int', default: 0 })
  refillsUsed: number;

  // ── Linked Medicines (what was prescribed) ────────────────────

  @Column('simple-array', { name: 'medicine_ids', nullable: true })
  medicineIds: string[]; // Medicines approved under this prescription

  // ── Fraud Detection ───────────────────────────────────────────

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @Column({ name: 'flag_reason', type: 'text', nullable: true })
  flagReason: string;

  // ── Timestamps ────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
