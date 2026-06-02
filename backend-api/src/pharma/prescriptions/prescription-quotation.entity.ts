import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Prescription } from './prescription.entity';

@Entity('prescription_quotations')
export class PrescriptionQuotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prescription_id' })
  prescriptionId: string;

  @ManyToOne(() => Prescription)
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Column('jsonb', { name: 'items' })
  items: {
    medicineId: string;
    name: string;
    brand: string;
    strength: string;
    quantity: number;
    mrp: number;
    discount: number;
    taxAmount: number;
    isSubstituted: boolean;
    originalMedicineId?: string;
  }[];

  @Column('decimal', { name: 'subtotal', precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { name: 'delivery_charges', precision: 10, scale: 2 })
  deliveryCharges: number;

  @Column('decimal', { name: 'tax_total', precision: 10, scale: 2 })
  taxTotal: number;

  @Column('decimal', { name: 'discount_total', precision: 10, scale: 2 })
  discountTotal: number;

  @Column('decimal', { name: 'final_amount', precision: 10, scale: 2 })
  finalAmount: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
