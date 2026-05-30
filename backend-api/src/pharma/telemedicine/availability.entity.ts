import { 
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne 
} from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity('doctor_availabilities')
export class DoctorAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  doctor: Doctor;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'time' })
  startTime: string; // HH:mm

  @Column({ type: 'time' })
  endTime: string; // HH:mm

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: false })
  isBooked: boolean;

  @Column({ nullable: true })
  bookedByUserId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
