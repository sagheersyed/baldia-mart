import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Index('IDX_CATEGORIES_PARENT', ['parentCategoryId'])
@Index('IDX_CATEGORIES_SORT_ORDER', ['sortOrder'])
@Index('IDX_CATEGORIES_SECTION_ACTIVE', ['section', 'isActive'])
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string | null;

  @Column({ name: 'section', default: 'mart' })
  section: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string;

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string;

  @Column({ name: 'parent_category_id', type: 'uuid', nullable: true })
  parentCategoryId: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
