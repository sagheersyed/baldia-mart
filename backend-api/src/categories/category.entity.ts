import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ name: 'section', default: 'mart' })
  section: string; // mart, restaurant

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string; // e.g., '09:00'

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string; // e.g., '23:00'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
