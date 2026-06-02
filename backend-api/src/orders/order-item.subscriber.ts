import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';

/**
 * Increments Product.soldCount when an OrderItem is created.
 * This keeps best-sellers automatically up-to-date based on real sales.
 *
 * NOTE: We register this subscriber via DataSource so we can keep DI inside
 * a Nest provider without needing a global TypeORM singleton.
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
    if (!item || !item.productId || !item.quantity) return;
    try {
      await event.manager
        .getRepository(Product)
        .increment({ id: item.productId } as any, 'soldCount', Number(item.quantity) || 0);
    } catch (err: any) {
      this.logger.warn(
        `OrderItemSubscriber soldCount increment failed for ${item.productId}: ${err?.message || err}`,
      );
    }
  }
}
