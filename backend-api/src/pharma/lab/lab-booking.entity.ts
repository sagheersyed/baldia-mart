import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Address } from '../../addresses/address.entity';

export type LabBookingStatus = 
  | 'pending' 
  | 'collector_assigned' 
  | 'sample_collected' 
  | 'in_lab' 
  | 'results_ready' 
  | 'cancelled';

@Index('IDX_LAB_BOOKING_USER', ['userId'])
@Index('IDX_LAB_BOOKING_STATUS', ['status'])
@Entity('lab_bookings')
export class LabBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'test_ids', type: 'text', array: true })
  testIds: string[]; // List of LabTest IDs

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'time_slot' })
  timeSlot: string; // e.g. "09:00 AM - 10:00 AM"

  @Column({ name: 'address_id' })
  addressId: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @Column({
    type: 'enum',
    enum: ['pending', 'collector_assigned', 'sample_collected', 'in_lab', 'results_ready', 'cancelled'],
    default: 'pending'
  })
  status: LabBookingStatus;

  @Column({ name: 'collector_id', nullable: true })
  collectorId: string; // Rider/Collector ID

  @Column({ name: 'report_url', nullable: true })
  reportUrl: string; // Link to the PDF results

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'availability_id', nullable: true })
  availabilityId: string;

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: string;

  @Column({ name: 'payment_method', default: 'cod' })
  paymentMethod: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
