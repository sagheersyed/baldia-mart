import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

/**
 * LabTest — represents a diagnostic test available for booking.
 */
@Index('IDX_LAB_TEST_ACTIVE', ['isActive'])
@Entity('lab_tests')
export class LabTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Complete Blood Count (CBC)"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  category: string; // e.g., "Blood Test", "Urine Test", "Radiology"

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'sample_type', nullable: true })
  sampleType: string; // e.g., "Blood", "Urine", "Swab"

  @Column({ name: 'preparation_instructions', type: 'text', nullable: true })
  preparationInstructions: string; // e.g., "8-12 hours fasting required"

  @Column({ name: 'turnaround_time', nullable: true })
  turnaroundTime: string; // e.g., "24 Hours"

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
