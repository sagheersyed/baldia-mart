import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { PharmaRecurringOrder } from './pharma-recurring-order.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PharmaOrdersService } from '../orders/pharma-orders.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { Medicine } from '../medicines/medicine.entity';

@Injectable()
export class RecurringOrdersService {
  private readonly logger = new Logger(RecurringOrdersService.name);

  constructor(
    @InjectRepository(PharmaRecurringOrder)
    private readonly recurringRepo: Repository<PharmaRecurringOrder>,
    private readonly pharmaOrdersService: PharmaOrdersService,
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  async create(userId: string, dto: Partial<PharmaRecurringOrder>) {
    if (!dto.medicineId) {
      throw new BadRequestException('medicineId is required.');
    }

    // Prevent duplicate active subscriptions for the same medicine
    const existing = await this.recurringRepo.findOne({
      where: { userId, medicineId: dto.medicineId, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException('You already have an active subscription for this medicine.');
    }

    // Load medicine details to check if prescription is required
    const medicine = await this.recurringRepo.manager.findOne(Medicine, { where: { id: dto.medicineId } });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    let resolvedPrescriptionId = dto.prescriptionId;
    if (medicine.requiresPrescription) {
      if (!resolvedPrescriptionId) {
        // Try to automatically resolve user's latest valid approved prescription
        const validRx = await this.prescriptionsService.validateForPurchase(userId, dto.medicineId);
        if (!validRx) {
          throw new BadRequestException('A valid approved prescription is required to subscribe to this medicine.');
        }
        resolvedPrescriptionId = validRx.id;
      } else {
        // Verify that the provided prescription is valid
        const rx = await this.prescriptionsService.findById(resolvedPrescriptionId);
        if (!rx || rx.userId !== userId || rx.status !== 'approved') {
          throw new BadRequestException('The provided prescription is invalid or not approved.');
        }
        const now = new Date();
        if (rx.validUntil && rx.validUntil < now) {
          throw new BadRequestException('The provided prescription has expired.');
        }
        if (rx.refillsUsed >= rx.maxRefills) {
          throw new BadRequestException('The provided prescription has no remaining refills.');
        }
        if (!rx.medicineIds.includes(dto.medicineId)) {
          throw new BadRequestException('The provided prescription does not cover this medicine.');
        }
      }
    }

    // Default nextDeliveryDate should be in the future based on frequency
    const now = new Date();
    const nextDate = new Date();
    if (dto.frequency === 'daily') nextDate.setDate(now.getDate() + 1);
    else if (dto.frequency === 'weekly') nextDate.setDate(now.getDate() + 7);
    else if (dto.frequency === 'monthly') nextDate.setMonth(now.getMonth() + 1);
    else nextDate.setMonth(now.getMonth() + 1);

    const order = this.recurringRepo.create({
      ...dto,
      userId,
      prescriptionId: resolvedPrescriptionId,
      nextDeliveryDate: dto.nextDeliveryDate || nextDate,
      status: 'active',
      startDate: dto.startDate || now,
    });
    return this.recurringRepo.save(order);
  }

  /**
   * Cron Job: Runs every night at 1:00 AM to process recurring refills.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async processRecurringRefills() {
    this.logger.log('Starting recurring pharma refill process...');
    const dueOrders = await this.getDueForDelivery();
    this.logger.log(`Found ${dueOrders.length} subscriptions due for refill.`);

    const grouped = new Map<string, PharmaRecurringOrder[]>();
    for (const sub of dueOrders) {
      if (!sub.addressId) {
        this.logger.error(`No address associated with subscription ${sub.id}`);
        continue;
      }
      const key = `${sub.userId}-${sub.addressId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(sub);
    }

    for (const [key, subs] of grouped.entries()) {
      try {
        await this.generateCombinedOrder(subs);
        for (const sub of subs) {
          await this.advanceSchedule(sub.id);
        }
        this.logger.log(`Successfully processed refill for grouped key: ${key}`);
      } catch (err: any) {
        this.logger.error(`Failed to process refill for grouped key: ${key}`, err.stack);
      }
    }
  }

  /**
   * Generates a combined order from multiple subscriptions.
   */
  private async generateCombinedOrder(subs: PharmaRecurringOrder[]) {
    if (subs.length === 0) return;

    const firstSub = subs[0];

    const items = subs.map(sub => ({
      medicineId: sub.medicineId,
      quantity: sub.quantity,
    }));

    const subIds = subs.map(s => s.id.slice(0, 8)).join(', ');

    const orderData = {
      addressId: firstSub.addressId,
      paymentMethod: firstSub.paymentMethod || 'cod',
      prescriptionId: firstSub.prescriptionId,
      items,
      notes: `Recurring Refill - Sub IDs: ${subIds}`,
      recurringOrderId: subs.map(s => s.id).join(','),
    };

    return this.pharmaOrdersService.placeOrder(firstSub.userId, orderData);
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
      default: next.setMonth(next.getMonth() + 1); break;
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

  /**
   * Find all recurring orders for admin panel.
   */
  async findAll() {
    return this.recurringRepo.find({
      relations: ['medicine', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
}

