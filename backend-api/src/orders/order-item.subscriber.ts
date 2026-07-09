import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { Medicine } from '../pharma/medicines/medicine.entity';

/**
 * Increments Product.soldCount or Medicine.soldCount when an OrderItem is created.
 * This keeps best-sellers automatically up-to-date based on real sales.
 */
@Injectable()
@EventSubscriber()
export class OrderItemSubscriber implements EntitySubscriberInterface<OrderItem> {
  private readonly logger = new Logger(OrderItemSubscriber.name);

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return OrderItem;
  }

  async afterInsert(event: InsertEvent<OrderItem>): Promise<void> {
    const item = event.entity;
    if (!item) return;

    const qty = Number(item.quantity) || 0;
    if (qty <= 0) return;

    if (item.productId) {
      try {
        await event.manager
          .getRepository(Product)
          .increment({ id: item.productId } as any, 'soldCount', qty);
      } catch (err: any) {
        this.logger.warn(
          `OrderItemSubscriber soldCount increment failed for Product ${item.productId}: ${err?.message || err}`,
        );
      }
    }

    if (item.medicineId) {
      try {
        await event.manager
          .getRepository(Medicine)
          .increment({ id: item.medicineId } as any, 'soldCount', qty);
      } catch (err: any) {
        this.logger.warn(
          `OrderItemSubscriber soldCount increment failed for Medicine ${item.medicineId}: ${err?.message || err}`,
        );
      }
    }
  }
}
