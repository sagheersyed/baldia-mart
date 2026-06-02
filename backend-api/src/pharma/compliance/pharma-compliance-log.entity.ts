import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Compliance audit log — tracks all compliance-related events for healthcare
 * regulatory traceability. Immutable append-only table.
 */
@Index('IDX_COMPLIANCE_ORDER', ['orderId'])
@Index('IDX_COMPLIANCE_USER', ['userId'])
@Index('IDX_COMPLIANCE_EVENT', ['eventType'])
@Entity('pharma_compliance_logs')
export class PharmaComplianceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type' })
  eventType: string;
  // prescription_uploaded, prescription_approved, prescription_rejected,
  // controlled_purchase_attempt, age_restricted_blocked,
  // expired_medicine_blocked, duplicate_order_blocked,
  // dosage_limit_exceeded, substitution_accepted, substitution_rejected

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'medicine_id', nullable: true })
  medicineId: string;

  @Column({ name: 'pharmacy_id', nullable: true })
  pharmacyId: string;

  @Column({ name: 'prescription_id', nullable: true })
  prescriptionId: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string; // Who performed the action (admin/pharmacist)

  @Column({ name: 'actor_type', nullable: true })
  actorType: string; // 'user', 'admin', 'pharmacist', 'system'

  @Column({ type: 'text', nullable: true })
  details: string; // JSON or human-readable description

  @Column({ name: 'severity', default: 'info' })
  severity: string; // info, warning, critical

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
