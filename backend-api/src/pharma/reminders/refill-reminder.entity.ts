import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Index('IDX_REFILL_USER', ['userId'])
@Index('IDX_REFILL_DATE', ['nextRefillDate'])
@Entity('refill_reminders')
export class RefillReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'medicine_name' })
  medicineName: string;

  @Column({ name: 'last_purchase_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastPurchaseDate: Date;

  @Column({ name: 'days_supply', default: 30 })
  daysSupply: number; // e.g. 30 days

  @Column({ name: 'next_refill_date', type: 'timestamp' })
  nextRefillDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'auto_remind', default: true })
  autoRemind: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
