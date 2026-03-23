import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../products/product.entity';
import { MenuItem } from '../menu-items/menu-item.entity';
import { SubOrder } from './sub-order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'menu_item_id', nullable: true })
  menuItemId: string;

  @ManyToOne(() => MenuItem, { nullable: true })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ name: 'sub_order_id', nullable: true })
  subOrderId: string;

  @ManyToOne(() => SubOrder, subOrder => subOrder.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sub_order_id' })
  subOrder: SubOrder;

  @Column()
  quantity: number;

  @Column('decimal', { name: 'price_at_time', precision: 10, scale: 2 })
  priceAtTime: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
