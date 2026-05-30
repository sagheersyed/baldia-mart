import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Medicine } from '../medicines/medicine.entity';
import { Order } from '../../orders/order.entity';

@Index('IDX_MED_REVIEW_MEDICINE', ['medicineId'])
@Index('IDX_MED_REVIEW_USER', ['userId'])
@Entity('medicine_reviews')
export class MedicineReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'medicine_id' })
  medicineId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'int', default: 5 })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean;

  @Column({ name: 'is_approved', default: true })
  isApproved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
