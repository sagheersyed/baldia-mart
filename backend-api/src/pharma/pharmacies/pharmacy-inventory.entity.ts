import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Medicine } from '../medicines/medicine.entity';
import { Pharmacy } from './pharmacy.entity';

/**
 * Pharmacy-specific inventory — each pharmacy maintains independent
 * stock, pricing, and expiry tracking per medicine.
 * This enables the multi-pharmacy marketplace model.
 */
@Unique('UQ_PHARMACY_MEDICINE', ['pharmacyId', 'medicineId'])
@Index('IDX_PHARMA_INV_PHARMACY', ['pharmacyId'])
@Index('IDX_PHARMA_INV_MEDICINE', ['medicineId'])
@Index('IDX_PHARMA_INV_EXPIRY', ['expiryDate'])
@Entity('pharmacy_inventory')
export class PharmacyInventory {
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

  // ── Stock ─────────────────────────────────────────────────────

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity: number; // Locked by active orders

  // ── Pharmacy-specific pricing (overrides medicine MRP) ────────

  @Column('decimal', { name: 'selling_price', precision: 10, scale: 2, nullable: true })
  sellingPrice: number; // Pharmacy's selling price (null = use MRP)

  @Column('decimal', { name: 'pharmacy_discount', precision: 10, scale: 2, default: 0 })
  pharmacyDiscount: number;

  // ── Expiry Tracking ───────────────────────────────────────────

  @Column({ name: 'batch_number', nullable: true })
  batchNumber: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ name: 'is_quarantined', default: false })
  isQuarantined: boolean; // Flagged for near-expiry or quality issue

  // ── Availability ──────────────────────────────────────────────

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
