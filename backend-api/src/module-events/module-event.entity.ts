import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('module_events')
export class ModuleEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  /** Which app section this event belongs to: 'mart' | 'food' | 'pharma' */
  @Column({ default: 'mart' })
  section: string;

  /** Comma-separated tags for filtering/display, e.g. 'ramadan,eid,sale' */
  @Column({ type: 'text', nullable: true })
  tags: string;

  /** JSON array of product/medicine/menuItem IDs associated with this event */
  @Column({ type: 'simple-json', name: 'item_ids', nullable: true })
  itemIds: string[];

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
