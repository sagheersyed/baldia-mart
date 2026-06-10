import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, OneToMany,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from '../../users/user.entity';
import { ChangeRequestDiscussion } from './change-request-discussion.entity';

/**
 * Generic Change Request — stores proposed modifications to any entity
 * in the marketplace. Uses RFC 6902 JSON Patch format for updates and
 * full-object JSON for create actions.
 *
 * Status lifecycle:
 *   draft → submitted → (auto_approved | under_review) → approved → merging → published
 *                                                       → rejected → draft (resubmit)
 */
@Index('IDX_CR_TENANT', ['tenantId'])
@Index('IDX_CR_STATUS', ['status'])
@Index('IDX_CR_ENTITY', ['entityType', 'entityId'])
@Index('IDX_CR_LOOKUP', ['status', 'createdAt'])
@Index('IDX_CR_REQUESTED_BY', ['requestedBy'])
@Entity('change_requests')
export class ChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Tenant scoping ───────────────────────────────────────────
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // ── Target entity ────────────────────────────────────────────
  @Column({ name: 'entity_type', length: 50 })
  entityType: string; // 'Product', 'VendorProduct', 'MenuItem', 'PharmacyMedicine', 'StoreProfile'

  @Column({ name: 'entity_id', nullable: true })
  entityId: string; // NULL for CREATE actions

  @Column({ name: 'action_type', length: 20 })
  actionType: string; // 'CREATE' | 'UPDATE' | 'DELETE'

  // ── Status lifecycle ─────────────────────────────────────────
  @Column({ length: 30, default: 'draft' })
  status: string;
  // 'draft', 'submitted', 'auto_approved', 'under_review',
  // 'approved', 'rejected', 'merging', 'published', 'failed'

  // ── Actors ───────────────────────────────────────────────────
  @Column({ name: 'requested_by' })
  requestedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  reviewer: User;

  // ── Payloads ─────────────────────────────────────────────────
  /**
   * For CREATE: full object payload.
   * For UPDATE: RFC 6902 JSON patch array.
   * For DELETE: empty or {}.
   */
  @Column({ name: 'patch_data', type: 'jsonb' })
  patchData: any;

  /** Snapshot of the original entity at the time of submission (for audit diff). */
  @Column({ name: 'pre_change_snapshot', type: 'jsonb', nullable: true })
  preChangeSnapshot: any;

  /** Version of the entity when the snapshot was taken (optimistic locking). */
  @Column({ name: 'entity_version', type: 'int', nullable: true })
  entityVersion: number;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // ── Discussions ──────────────────────────────────────────────
  @OneToMany(() => ChangeRequestDiscussion, d => d.changeRequest)
  discussions: ChangeRequestDiscussion[];

  // ── Timestamps ───────────────────────────────────────────────
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;
}
