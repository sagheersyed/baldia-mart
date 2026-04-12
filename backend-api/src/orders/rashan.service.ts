import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { SettingsService } from '../settings/settings.service';
import { OrdersGateway } from './orders.gateway';
import { User } from '../users/user.entity';
import { Rider } from '../riders/rider.entity';
import { Address } from '../addresses/address.entity';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';

export interface SubmitRashanOrderDto {
  addressId?: string; // Formal address entity ID
  bulkListText?: string;
  bulkListPhotoUrl?: string;
  bulkMobileNumber: string;
  bulkStreetAddress: string;
  bulkCity: string;
  bulkLandmark?: string;
  bulkFloor: number;
  bulkPlacement: 'gate' | 'doorstep' | 'inside';
  bulkWeightTier: 'light' | 'medium' | 'heavy';
  bulkAdditionalNotes?: string;
}

@Injectable()
export class RashanService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    private settingsService: SettingsService,
    private ordersGateway: OrdersGateway,
    private zonesService: DeliveryZonesService,
  ) {}

  private async emitUpdate(order: Order) {
    // Notify general listeners (Admin, etc)
    this.ordersGateway.emitOrderStatusUpdate(
      order.id,
      order.orderType === 'rashan' ? order.rashanStatus : order.status,
      order.userId,
      order.riderId,
    );

    // Notify specifically interested entities (Order Room)
    this.ordersGateway.emitOrderUpdate(order.id, order);
  }

  /**
   * Calculate the estimated service fee (not incl. product cost).
   */
  async calculateServiceFee(
    weightTier: string,
    floor: number,
    placement: string,
  ): Promise<number> {
    const settings = await this.settingsService.getPublic();
    let fee = settings.rashan_base_fee ?? 750;

    // Weight surcharge
    if (weightTier === 'medium') fee += settings.rashan_surcharge_medium ?? 200;
    if (weightTier === 'heavy') fee += settings.rashan_surcharge_heavy ?? 450;

    // Floor surcharge
    if (floor >= 1 && floor <= 2) fee += settings.rashan_floor_surcharge_low ?? 150;
    if (floor >= 3) fee += settings.rashan_floor_surcharge_high ?? 300;

    // Inside placement
    if (placement === 'inside') fee += settings.rashan_placement_fee ?? 150;

    return fee;
  }

  /**
   * User submits a Rashan order request.
   */
  async submitRequest(userId: string, dto: SubmitRashanOrderDto): Promise<Order> {
    if (!dto.bulkListText && !dto.bulkListPhotoUrl) {
      throw new BadRequestException('Please provide either a text list or a photo of your grocery list.');
    }

    // 1. Zone Validation
    if (dto.addressId) {
      const address = await this.addressRepository.findOne({ where: { id: dto.addressId } });
      if (!address) throw new NotFoundException('Selected address not found.');
      
      const zoneCheck = await this.zonesService.validateAddressInZone(address.latitude, address.longitude);
      if (!zoneCheck.isValid) {
        throw new BadRequestException('Delivery address is outside of our service zone (Max 5km radius).');
      }
    }

    const serviceFee = await this.calculateServiceFee(
      dto.bulkWeightTier,
      dto.bulkFloor,
      dto.bulkPlacement,
    );

    const orderEntity = new Order();
    Object.assign(orderEntity, {
      userId,
      addressId: dto.addressId || null,
      orderType: 'rashan',
      rashanStatus: 'pending_review',
      status: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      subtotal: 0,
      deliveryFee: serviceFee,
      total: serviceFee,
      discountAmount: 0,
      riderCommission: 0,
      ...dto,
    });

    const order = await this.orderRepository.save(orderEntity);

    // Notify Admin of new request
    const fullOrder = await this.getById(order.id);
    this.ordersGateway.emitNewOrderToAdmin(fullOrder);

    return order;
  }

  /**
   * Get all Rashan orders (Admin only).
   */
  async getAllForAdmin(): Promise<Order[]> {
    return this.orderRepository.find({
      where: { orderType: 'rashan' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single Rashan order.
   */
  async getById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, orderType: 'rashan' },
      relations: ['user', 'rider'],
    });
    if (!order) throw new NotFoundException('Rashan order not found.');
    return order;
  }

  /**
   * Get all Rashan orders for a specific user.
   */
  async getForUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId, orderType: 'rashan' },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Admin: set a quotation total.
   */
  /**
   * Admin: set a quotation with separate product and logistics components.
   */
  async setQuotation(id: string, productTotal: number, deliveryFeeOverride?: number): Promise<Order> {
    const order = await this.getById(id);
    if (order.rashanStatus !== 'pending_review') {
      throw new BadRequestException('Order is not in pending_review status.');
    }

    // Set product price into subtotal
    order.subtotal = productTotal;

    // Use override if provided, otherwise keep existing calculated fee
    if (deliveryFeeOverride !== undefined && deliveryFeeOverride !== null) {
      order.deliveryFee = deliveryFeeOverride;
    }

    // Final total = Products + Logistics
    order.total = Number(order.subtotal) + Number(order.deliveryFee);
    order.estimatedTotal = order.total; // Keep for backward compatibility/quick ref

    order.rashanStatus = 'quoted';
    const updated = await this.orderRepository.save(order);
    this.emitUpdate(updated);
    return updated;
  }

  /**
   * Admin: reject the order with a reason.
   */
  async rejectOrder(id: string, reason: string): Promise<Order> {
    const order = await this.getById(id);
    order.rashanStatus = 'rejected';
    order.adminRejectionReason = reason;
    order.status = 'cancelled';
    const updated = await this.orderRepository.save(order);
    this.emitUpdate(updated);
    return updated;
  }

  /**
   * User: approve the quotation.
   */
  async approveQuotation(id: string, userId: string): Promise<Order> {
    const order = await this.getById(id);
    if (order.userId !== userId) throw new BadRequestException('Not authorized.');
    if (order.rashanStatus !== 'quoted') {
      throw new BadRequestException('No quotation available to approve yet.');
    }
    order.isEstimateApproved = true;
    order.rashanStatus = 'approved';
    const updated = await this.orderRepository.save(order);
    this.emitUpdate(updated);
    return updated;
  }

  /**
   * Admin: mark order as sourcing / in-progress.
   */
  async markSourcing(id: string, riderId?: string): Promise<Order> {
    const order = await this.getById(id);
    order.rashanStatus = 'sourcing';
    order.status = 'confirmed';
    if (riderId) order.riderId = riderId;
    const updated = await this.orderRepository.save(order);
    this.emitUpdate(updated);
    return updated;
  }

  /**
   * Admin/Rider: mark as delivered.
   */
  async markDelivered(id: string): Promise<Order> {
    const order = await this.getById(id);
    order.rashanStatus = 'delivered';
    order.status = 'delivered';
    const updated = await this.orderRepository.save(order);
    this.emitUpdate(updated);
    return updated;
  }

  /**
   * User: Cancel request.
   */
  async cancelRequest(id: string, userId: string): Promise<Order> {
    const order = await this.getById(id);
    if (order.userId !== userId) throw new BadRequestException('Not authorized.');
    
    const uncancelable = ['sourcing', 'delivered', 'rejected'];
    if (uncancelable.includes(order.rashanStatus)) {
      throw new BadRequestException(`Cannot cancel order in ${order.rashanStatus} status.`);
    }

    order.rashanStatus = 'cancelled';
    order.status = 'cancelled';
    const updated = await this.orderRepository.save(order);
    this.emitUpdate(updated);
    return updated;
  }
}
