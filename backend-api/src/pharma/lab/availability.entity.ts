import { 
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn 
} from 'typeorm';

@Entity('lab_availabilities')
export class LabAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'time' })
  startTime: string; // HH:mm

  @Column({ type: 'time' })
  endTime: string; // HH:mm

  @Column({ default: 10 })
  maxCapacity: number; // Max patients per slot

  @Column({ default: 0 })
  currentBookings: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
