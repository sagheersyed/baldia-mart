import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from '../../users/user.entity';

/**
 * Immutable audit trail for all CMS operations.
 * Append-only: no UPDATE or DELETE should ever be performed on this table.
 */
@Index('IDX_AUDIT_TENANT', ['tenantId'])
@Index('IDX_AUDIT_USER', ['userId'])
@Index('IDX_AUDIT_ACTION', ['action'])
@Index('IDX_AUDIT_CREATED', ['createdAt'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Dot-notation action key, e.g. 'product.price_update', 'pharmacy.license_upload' */
  @Column({ length: 255 })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  /** Arbitrary JSON payload with request details */
  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  /** If this audit log relates to a change request */
  @Column({ name: 'change_request_id', nullable: true })
  changeRequestId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
