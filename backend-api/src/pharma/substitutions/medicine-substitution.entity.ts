import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Medicine } from '../medicines/medicine.entity';

/**
 * Medicine substitution mapping — pharmacist-controlled generic alternatives.
 * When a medicine is unavailable, the system suggests approved substitutions
 * that the customer must explicitly accept before checkout.
 */
@Unique('UQ_SUBSTITUTION_PAIR', ['originalMedicineId', 'substituteMedicineId'])
@Index('IDX_SUBSTITUTION_ORIGINAL', ['originalMedicineId'])
@Entity('medicine_substitutions')
export class MedicineSubstitution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_medicine_id' })
  originalMedicineId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'original_medicine_id' })
  originalMedicine: Medicine;

  @Column({ name: 'substitute_medicine_id' })
  substituteMedicineId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'substitute_medicine_id' })
  substituteMedicine: Medicine;

  // ── Pharmacist Control ────────────────────────────────────────

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string; // Pharmacist/Admin who approved this mapping

  @Column({ name: 'substitution_reason', type: 'text', nullable: true })
  substitutionReason: string; // e.g. "Same generic composition"

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number; // Higher = preferred substitute

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
