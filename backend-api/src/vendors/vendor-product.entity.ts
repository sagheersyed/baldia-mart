import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Vendor } from './vendor.entity';
import { Product } from '../products/product.entity';

@Entity('vendor_products')
export class VendorProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'vendor_id' })
  vendorId: string;

  @ManyToOne(() => Vendor, vendor => vendor.vendorProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Index()
  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'stock_qty', default: 0 })
  stockQty: number;

  @Index()
  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
