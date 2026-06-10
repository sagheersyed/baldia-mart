import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique, Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from '../../users/user.entity';

/**
 * RBAC membership — links a User to a Tenant with a specific role.
 * A user may belong to multiple tenants (e.g. owns a grocery shop and a restaurant).
 */
@Unique('UQ_TENANT_USER', ['tenantId', 'userId'])
@Index('IDX_TENANT_USER_TENANT', ['tenantId'])
@Index('IDX_TENANT_USER_USER', ['userId'])
@Entity('tenant_users')
export class TenantUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, tenant => tenant.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50 })
  role: string; // 'owner' | 'manager' | 'staff' | 'pharmacist' | 'assistant_pharmacist'

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'cms_pin', nullable: true })
  cmsPin: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
