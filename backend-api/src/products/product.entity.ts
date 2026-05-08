import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Brand } from '../brands/brand.entity';

@Index('IDX_PRODUCTS_ACTIVE', ['isActive'])
@Index('IDX_PRODUCTS_CATEGORY_ID', ['categoryId'])
@Index('IDX_PRODUCTS_BRAND_ID', ['brandId'])
@Index('IDX_PRODUCTS_FEATURED', ['isFeatured'])
@Index('IDX_PRODUCTS_BEST_SELLER', ['isBestSeller'])
@Index('IDX_PRODUCTS_DEAL', ['isDeal'])
@Index('IDX_PRODUCTS_SORT_ORDER', ['sortOrder'])
@Index('IDX_PRODUCTS_CREATED_AT', ['createdAt'])
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string;

  @ManyToOne(() => Brand, brand => brand.products)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Index('IDX_PRODUCTS_NAME')
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { name: 'discount_price', precision: 10, scale: 2, default: 0, nullable: true })
  discount: number;

  @Column({ name: 'stock_quantity', default: 0 })
  stockQuantity: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string;

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string;

  @Column({ name: 'max_quantity_per_order', default: 0 })
  maxQuantityPerOrder: number;

  // ─── Discovery / merchandising flags ───
  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_best_seller', default: false })
  isBestSeller: boolean;

  @Column({ name: 'is_deal', default: false })
  isDeal: boolean;

  @Column({ name: 'discount_percent', type: 'int', nullable: true })
  discountPercent: number | null;

  @Column({ name: 'unit', type: 'varchar', length: 32, nullable: true })
  unit: string | null; // 'kg' | 'g' | 'ml' | 'L' | 'pcs' | etc.

  @Column({ name: 'weight', type: 'varchar', length: 64, nullable: true })
  weight: string | null; // '500g', '1kg', '12 pcs'

  @Index('IDX_PRODUCTS_TAGS')
  @Column({ name: 'tags', type: 'text', array: true, nullable: true })
  tags: string[] | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'sold_count', type: 'int', default: 0 })
  soldCount: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'rating', type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
