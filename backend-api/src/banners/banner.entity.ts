import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'mart' })
  section: string; // 'mart' | 'food' | 'all'

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  tagLabel: string; // e.g. "FLASH SALE 🔥"

  @Column({ nullable: true })
  linkType: string; // 'product' | 'brand' | 'restaurant' | 'category' | 'none'

  @Column({ nullable: true })
  linkId: string;

  @Column({ default: '#FF4500' })
  backgroundColor: string;

  @Column({ default: '#fff' })
  textColor: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  zoneId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
