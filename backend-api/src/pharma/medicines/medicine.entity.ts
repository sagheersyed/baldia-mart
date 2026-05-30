import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, OneToMany,
} from 'typeorm';
import { Brand } from '../../brands/brand.entity';

/**
 * Core medicine/pharmaceutical product entity.
 * Separate from Product entity to enforce pharma-specific fields
 * (dosage, composition, prescription requirements, expiry tracking)
 * while reusing shared infrastructure (categories, brands, search).
 */
@Index('IDX_MEDICINES_ACTIVE', ['isActive'])
@Index('IDX_MEDICINES_CATEGORY', ['categoryId'])
@Index('IDX_MEDICINES_BRAND', ['brandId'])
@Index('IDX_MEDICINES_REQUIRES_PRESCRIPTION', ['requiresPrescription'])
@Index('IDX_MEDICINES_NAME_TRGM', ['name'])
@Entity('medicines')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Identity ──────────────────────────────────────────────────

  @Column()
  name: string; // e.g. "Panadol Extra 500mg"

  @Column({ name: 'generic_name', nullable: true })
  genericName: string; // e.g. "Paracetamol + Caffeine"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  // ── Classification ────────────────────────────────────────────

  @Column({ name: 'category_id', nullable: true })
  categoryId: string; // FK to categories table (section='pharma')

  @Column({ name: 'brand_id', nullable: true })
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ 
    type: 'enum', 
    enum: ['medicine', 'device', 'supplement', 'healthcare'], 
    default: 'medicine',
    name: 'item_type'
  })
  itemType: string;

  @Column({ name: 'dosage_form', nullable: true })
  dosageForm: string; // tablet, capsule, syrup, injection, cream, drops, inhaler

  @Column({ name: 'strength', nullable: true })
  strength: string; // e.g. "500mg", "250mg/5ml"

  @Column({ name: 'pack_size', nullable: true })
  packSize: string; // e.g. "10 tablets", "100ml", "30 capsules"

  @Column({ name: 'composition', type: 'text', nullable: true })
  composition: string; // Active ingredients

  // ── Compliance ────────────────────────────────────────────────

  @Column({ name: 'requires_prescription', default: false })
  requiresPrescription: boolean;

  @Column({ name: 'is_controlled', default: false })
  isControlled: boolean; // Scheduled/controlled substances

  @Column({ name: 'is_age_restricted', default: false })
  isAgeRestricted: boolean;

  @Column({ name: 'min_age', type: 'int', nullable: true })
  minAge: number; // Minimum age to purchase

  @Column({ name: 'max_quantity_per_order', type: 'int', default: 10 })
  maxQuantityPerOrder: number;

  // ── Pricing ───────────────────────────────────────────────────

  @Column('decimal', { name: 'mrp', precision: 10, scale: 2 })
  mrp: number; // Maximum Retail Price

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  discount: number; // Flat discount amount

  @Column({ name: 'discount_percent', type: 'int', nullable: true })
  discountPercent: number;

  // ── Merchandising ─────────────────────────────────────────────

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_otc', default: true })
  isOtc: boolean; // Over-the-counter (true) vs prescription-only (false)

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_emergency', default: false })
  isEmergency: boolean; // Emergency medicine — prioritized dispatch

  @Column({ name: 'is_cold_chain', default: false })
  isColdChain: boolean; // Requires temperature-controlled delivery

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'tags', type: 'text', array: true, nullable: true })
  tags: string[]; // ['pain-relief', 'fever', 'headache']

  // ── Analytics ─────────────────────────────────────────────────

  @Column({ name: 'sold_count', type: 'int', default: 0 })
  soldCount: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'rating', type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  // ── Timestamps ────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
