import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Index('IDX_REMINDER_USER', ['userId'])
@Index('IDX_REMINDER_ACTIVE', ['isActive'])
@Entity('medicine_reminders')
export class MedicineReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'medicine_id', nullable: true })
  medicineId: string; // Optional link to catalog

  @Column({ name: 'medicine_name' })
  medicineName: string;

  @Column({ nullable: true })
  dosage: string; // e.g. "1 Tablet", "5ml"

  @Column({ default: 'daily' })
  frequency: string; // daily, twice_daily, thrice_daily, weekly, custom

  @Column({ type: 'text', array: true })
  times: string[]; // e.g. ["08:00", "20:00"]

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
