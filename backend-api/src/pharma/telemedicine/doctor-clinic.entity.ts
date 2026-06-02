import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Clinic } from './clinic.entity';
import { AvailabilityTemplate } from './availability-template.entity';

@Entity('doctor_clinics')
export class DoctorClinic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Column({ name: 'clinic_id' })
  clinicId: string;

  @ManyToOne(() => Doctor, doctor => doctor.doctorClinics)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => Clinic, clinic => clinic.doctorClinics)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column('decimal', { precision: 10, scale: 2 })
  consultationFee: number;

  @Column({ default: 'physical' })
  consultationType: string; // "physical" or "video"

  @OneToMany(() => AvailabilityTemplate, (template) => template.doctorClinic)
  availabilityTemplates: AvailabilityTemplate[];
}
