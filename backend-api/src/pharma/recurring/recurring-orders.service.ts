import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { PharmaRecurringOrder } from './pharma-recurring-order.entity';

@Injectable()
export class RecurringOrdersService {
  constructor(
    @InjectRepository(PharmaRecurringOrder)
    private readonly recurringRepo: Repository<PharmaRecurringOrder>,
  ) {}

  async create(userId: string, dto: Partial<PharmaRecurringOrder>) {
    const order = this.recurringRepo.create({
      ...dto,
      userId,
      status: 'active',
    });
    return this.recurringRepo.save(order);
  }

  async findByUser(userId: string) {
    return this.recurringRepo.find({
      where: { userId },
      relations: ['medicine'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const order = await this.recurringRepo.findOne({
      where: { id },
      relations: ['medicine'],
    });
    if (!order) throw new NotFoundException('Recurring order not found');
    return order;
  }

  async pause(id: string, reason?: string) {
    const order = await this.findById(id);
    if (order.status !== 'active') {
      throw new BadRequestException('Only active subscriptions can be paused');
    }
    order.status = 'paused';
    order.pauseReason = reason || (undefined as any);
    return this.recurringRepo.save(order);
  }

  async resume(id: string) {
    const order = await this.findById(id);
    if (order.status !== 'paused') {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }
    order.status = 'active';
    order.pauseReason = undefined as any;
    return this.recurringRepo.save(order);
  }

  async cancel(id: string) {
    const order = await this.findById(id);
    order.status = 'cancelled';
    return this.recurringRepo.save(order);
  }

  /**
   * Find all recurring orders due for delivery today.
   * Called by a scheduled cron job to auto-generate orders.
   */
  async getDueForDelivery() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.recurringRepo.find({
      where: {
        status: 'active',
        nextDeliveryDate: LessThanOrEqual(today),
      },
      relations: ['medicine', 'user'],
    });
  }

  /**
   * Advance the next delivery date after a successful delivery.
   */
  async advanceSchedule(id: string) {
    const order = await this.findById(id);
    const next = new Date(order.nextDeliveryDate);

    switch (order.frequency) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
    }

    // Check if past end date
    if (order.endDate && next > new Date(order.endDate)) {
      order.status = 'completed';
    } else {
      order.nextDeliveryDate = next;
    }

    order.lastDeliveryDate = new Date();
    order.totalDeliveries += 1;

    return this.recurringRepo.save(order);
  }
}
