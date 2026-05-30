import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DoctorClinic } from './doctor-clinic.entity';
import { Consultation } from './consultation.entity';

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  mapUrl: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 'Clinic' })
  type: string; // "Hospital", "Clinic", "Video Room"

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => DoctorClinic, dc => dc.clinic)
  doctorClinics: DoctorClinic[];

  @OneToMany(() => Consultation, c => c.clinic)
  consultations: Consultation[];
}
