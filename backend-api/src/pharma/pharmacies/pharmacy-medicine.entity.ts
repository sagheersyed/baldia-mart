import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Pharmacy } from './pharmacy.entity';
import { Medicine } from '../medicines/medicine.entity';

@Unique('UQ_PHARMACY_MEDICINE', ['pharmacyId', 'medicineId'])
@Index('IDX_PHARMA_STOCK', ['pharmacyId', 'stockQuantity'])
@Entity('pharmacy_medicines')
export class PharmacyMedicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pharmacy_id' })
  pharmacyId: string;

  @ManyToOne(() => Pharmacy)
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @Column({ name: 'medicine_id' })
  medicineId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'stock_quantity', default: 0 })
  stockQuantity: number;

  @Column({ name: 'reserved_quantity', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'price_override', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride: number; // If this pharmacy sells at a different price than master catalog

  @Column({ name: 'shelf_location', nullable: true })
  shelfLocation: string; // e.g. "Rack A, Shelf 3"

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
