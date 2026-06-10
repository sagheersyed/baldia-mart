import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { TenantUser } from './tenant-user.entity';

/**
 * Core Tenant entity – a unified business identity that can represent
 * a Vendor (mart), Restaurant, or Pharmacy in the marketplace.
 * Links to the vertical-specific entity via entity_id + type.
 */
@Index('IDX_TENANT_TYPE', ['type'])
@Index('IDX_TENANT_STATUS', ['status'])
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ length: 30 })
  type: string; // 'mart' | 'restaurant' | 'pharmacy'

  /**
   * Foreign key pointing to the vertical-specific table.
   * e.g. vendors.id, restaurants.id, or pharmacies.id
   */
  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ length: 30, default: 'onboarding' })
  status: string; // 'onboarding' | 'active' | 'suspended' | 'deactivated'

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'banner_url', nullable: true })
  bannerUrl: string;

  @OneToMany(() => TenantUser, tu => tu.tenant)
  members: TenantUser[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
