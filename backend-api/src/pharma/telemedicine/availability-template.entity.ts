import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { DoctorClinic } from './doctor-clinic.entity';

@Entity('availability_templates')
export class AvailabilityTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'doctor_clinic_id' })
  doctorClinicId: string;

  @ManyToOne(() => DoctorClinic, (dc) => dc.availabilityTemplates)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ type: 'int' })
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)

  @Column()
  startTime: string; // "HH:mm"

  @Column()
  endTime: string; // "HH:mm"

  @Column({ type: 'int', default: 15 })
  slotDuration: number; // minutes
}
