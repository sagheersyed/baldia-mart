import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { DeliveryZone } from '../../delivery-zones/delivery-zone.entity';

/**
 * Pharmacy store entity — a licensed pharmacy vendor in the marketplace.
 * Links to DeliveryZone for geo-routing and to Vendor for marketplace payout.
 */
@Index('IDX_PHARMACY_ACTIVE', ['isActive'])
@Index('IDX_PHARMACY_ZONE', ['zoneId'])
@Index('IDX_PHARMACY_VERIFIED', ['isVerified'])
@Entity('pharmacies')
export class Pharmacy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Identity ──────────────────────────────────────────────────

  @Column()
  name: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'cover_url', nullable: true })
  coverUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'license_number', unique: true })
  licenseNumber: string; // Drug License / Pharmacy License

  @Column({ name: 'tax_number', nullable: true })
  taxNumber: string; // NTN / STRN

  // ── Contact ───────────────────────────────────────────────────

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  // ── Location ──────────────────────────────────────────────────

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @ManyToOne(() => DeliveryZone)
  @JoinColumn({ name: 'zone_id' })
  zone: DeliveryZone;

  @Column('decimal', { name: 'latitude', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { name: 'longitude', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column('decimal', { name: 'delivery_radius_km', precision: 5, scale: 2, default: 5.0 })
  deliveryRadiusKm: number;

  // ── Operations ────────────────────────────────────────────────

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string; // '09:00'

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string; // '23:00'

  @Column({ name: 'off_days', nullable: true })
  offDays: string; // e.g. '0,6' (Sunday and Saturday off)

  @Column({ name: 'friday_opening_time', nullable: true })
  fridayOpeningTime: string;

  @Column({ name: 'friday_closing_time', nullable: true })
  fridayClosingTime: string;

  @Column({ name: 'is_24_hours', default: false })
  is24Hours: boolean;

  @Column({ name: 'is_active', default: false })
  isActive: boolean; // Admin-controlled activation

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean; // License verification complete

  @Column({ name: 'is_open', default: true })
  isOpen: boolean; // Operational status

  @Column({ name: 'has_cold_chain_support', default: false })
  hasColdChainSupport: boolean; // Support for refrigerated medicines (Insulin, Vaccines)

  // ── Vendor Link ───────────────────────────────────────────────

  @Column({ name: 'vendor_id', nullable: true })
  vendorId: string; // Links to existing Vendor for payout/commission

  // ── Assigned Pharmacist ───────────────────────────────────────

  @Column({ name: 'pharmacist_name', nullable: true })
  pharmacistName: string;

  @Column({ name: 'pharmacist_license', nullable: true })
  pharmacistLicense: string;

  // ── Documentation (uploaded during onboarding) ────────────────

  @Column({ name: 'license_document_url', nullable: true })
  licenseDocumentUrl: string;

  @Column({ name: 'tax_document_url', nullable: true })
  taxDocumentUrl: string;

  // ── Ratings ───────────────────────────────────────────────────

  @Column('decimal', { name: 'rating', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'rating_count', default: 0 })
  ratingCount: number;

  // ── Commission ────────────────────────────────────────────────

  @Column('decimal', { name: 'commission_rate', precision: 5, scale: 2, default: 10.0 })
  commissionRate: number; // Percentage commission on sales

  // ── Onboarding Status ─────────────────────────────────────────

  @Column({ name: 'onboarding_status', default: 'pending' })
  onboardingStatus: string; // pending, documents_submitted, under_review, approved, rejected

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // ── Timestamps ────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
