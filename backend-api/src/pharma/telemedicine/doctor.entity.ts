import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  Index, OneToMany
} from 'typeorm';
import { DoctorClinic } from './doctor-clinic.entity';
import { Consultation } from './consultation.entity';

@Index('IDX_DOCTOR_ACTIVE', ['isActive'])
@Index('IDX_DOCTOR_SPECIALTY', ['specialization'])
@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  specialization: string; // e.g. "General Physician", "Dermatologist", "Pediatrician"

  @Column({ nullable: true })
  degree: string; // e.g. "MBBS, MD"

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  @Column({ nullable: true })
  hospital: string;
  
  @Column({ name: 'clinic_address', nullable: true })
  clinicAddress: string;

  @Column({ type: 'text', nullable: true })
  biography: string;

  @Column('decimal', { precision: 10, scale: 2 })
  consultationFee: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DoctorClinic, dc => dc.doctor)
  doctorClinics: DoctorClinic[];

  @OneToMany(() => Consultation, c => c.doctor)
  consultations: Consultation[];
}
