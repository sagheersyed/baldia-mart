import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderHistory } from './order-history.entity';
import { CartService } from '../cart/cart.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { AddressesService } from '../addresses/addresses.service';
import { SettingsService } from '../settings/settings.service';
import { OrdersGateway } from './orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Rider } from '../riders/rider.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderHistory) private orderHistoryRepository: Repository<OrderHistory>,
    @InjectRepository(Rider) private ridersRepository: Repository<Rider>,
    private cartService: CartService,
    private deliveryZonesService: DeliveryZonesService,
    private addressesService: AddressesService,
    private settingsService: SettingsService,
    private ordersGateway: OrdersGateway,
    private notificationsService: NotificationsService,
  ) {}

  async placeOrder(userId: string, addressId: string, paymentMethod: string, notes?: string, items?: any[]): Promise<Order> {
    console.log('--- PlaceOrder Debug ---');
    console.log('UserId:', userId);
    console.log('AddressId:', addressId);
    console.log('Items:', JSON.stringify(items));

    // 1. Get cart items (from DB or payload)
    let cartItems: any[] = [];
    if (items && items.length > 0) {
      // If items provided in body, we need to fetch corresponding products to get real prices
      for (const item of items) {
        const product = await this.orderItemsRepository.manager.getRepository('Product').findOne({ where: { id: item.productId } }) as any;
        if (product) {
          cartItems.push({
            productId: item.productId,
            quantity: item.quantity,
            product: product
          });
        }
      }
    } else {
      cartItems = await this.cartService.getCartByUserId(userId);
    }

    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    // 2. Validate Address & Delivery Fee
    const address = await this.addressesService.findOne(addressId);
    if (!address || address.userId !== userId) throw new BadRequestException('Invalid address');

    const pricing = await this.calculateDeliveryFee(addressId);
    if (!pricing.isValid) {
      throw new BadRequestException(`Delivery not available: ${pricing.message}`);
    }

    // 3. Calculate Totals
    let subtotal = 0;
    for (const item of cartItems) {
      const itemPrice = Number(item.product.price) - Number(item.product.discount || 0);
      subtotal += itemPrice * item.quantity;
    }
    
    // Calculate dynamic delivery fee
    const { deliveryFee, distance } = await this.calculateDeliveryFee(addressId);
    const total = subtotal + deliveryFee;

    // 4. Create Order
    const order = this.ordersRepository.create({
      userId,
      addressId,
      subtotal,
      deliveryFee: pricing.deliveryFee,
      total: subtotal + pricing.deliveryFee,
      paymentMethod,
      deliveryDistanceKm: pricing.distance,
      notes,
    });
    const savedOrder = await this.ordersRepository.save(order);

    // 5. Create Order Items
    const orderItemsToSave = cartItems.map(item => this.orderItemsRepository.create({
      orderId: savedOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtTime: Number(item.product.price) - Number(item.product.discount || 0),
    }));
    await this.orderItemsRepository.save(orderItemsToSave);

    // 6. Clear Cart if it was stored in DB
    if (!items) {
      await this.cartService.clearCart(userId);
    }

    // 7. Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: savedOrder.id, status: 'pending', notes: 'Order placed' })
    );

    // 8. Broadcast to Riders
    const orderWithDetails = await this.ordersRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'items.product', 'address', 'user']
    });
    if (orderWithDetails) {
      this.ordersGateway.emitNewOrder(orderWithDetails);

      // Send push notifications to all online riders
      this.notifyOnlineRiders(orderWithDetails);
    }

    return savedOrder;
  }

  private async notifyOnlineRiders(order: Order) {
    try {
      const onlineRiders = await this.ridersRepository.find({
        where: { isOnline: true, isActive: true },
        select: ['id', 'fcmToken'],
      });

      for (const rider of onlineRiders) {
        if (rider.fcmToken) {
          await this.notificationsService.sendToRider(
            rider.id,
            rider.fcmToken,
            'New Order Available! 🛍️',
            `A new order for Rs. ${order.total} has been placed nearby.`,
          );
        }
      }
    } catch (error) {
      console.error('Error notifying riders:', error);
    }
  }

  async getPendingOrders(): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { status: 'pending' },
      relations: ['items', 'items.product', 'address', 'user'],
      order: { createdAt: 'DESC' }
    });
  }

  async getAllOrdersForAdmin(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'items.product', 'address', 'user', 'rider'],
      order: { createdAt: 'DESC' }
    });
  }

  async acceptOrder(orderId: string, riderId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ 
      where: { id: orderId },
      relations: ['rider']
    });
    
    if (!order) throw new NotFoundException('Order not found');

    // Check if rider is blocked
    const riderRepo = this.ordersRepository.manager.getRepository('Rider');
    const rider = await riderRepo.findOne({ where: { id: riderId } }) as any;
    if (!rider || rider.isActive === false) {
      throw new ForbiddenException('Your account has been blocked. Please contact support.');
    }
    
    // allow same rider to "re-accept" (idempotency)
    if (order.riderId && order.riderId !== riderId) {
      throw new BadRequestException('Order already accepted by another rider');
    }
    
    if (order.status === 'cancelled') {
      throw new BadRequestException('Order was cancelled by the customer');
    }
    
    if (order.status !== 'pending' && order.riderId !== riderId) {
      throw new BadRequestException('Only pending orders can be accepted');
    }

    order.riderId = riderId;
    order.status = 'confirmed';
    const updatedOrder = await this.ordersRepository.save(order);

    // Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId, status: 'confirmed', notes: 'Rider accepted the order' })
    );

    // Notify User
    this.ordersGateway.emitOrderStatusUpdate(orderId, 'confirmed', order.userId);

    // Notify other riders to remove from available list
    this.ordersGateway.emitOrderAccepted(orderId);

    return updatedOrder;
  }

  async assignRider(orderId: string, riderId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ 
      where: { id: orderId }
    });
    
    if (!order) throw new NotFoundException('Order not found');

    const riderRepo = this.ordersRepository.manager.getRepository('Rider');
    const rider = await riderRepo.findOne({ where: { id: riderId } }) as any;
    if (!rider) throw new NotFoundException('Rider not found');

    order.riderId = riderId;
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
    
    const updatedOrder = await this.ordersRepository.save(order);

    // Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId, status: order.status, notes: `Admin manually assigned rider #${riderId.slice(0,8)}` })
    );

    // Notify User
    this.ordersGateway.emitOrderStatusUpdate(orderId, order.status, order.userId);
    
    // Notify previous and new riders (by broadcasting to order room/all)
    this.ordersGateway.emitOrderAccepted(orderId);

    return updatedOrder;
  }

  async getActiveOrdersForRider(riderId: string): Promise<Order[]> {
    return this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.riderId = :riderId', { riderId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['confirmed', 'preparing', 'out_for_delivery'] })
      .orderBy('order.updatedAt', 'DESC')
      .withDeleted() // This allows joining soft-deleted address/products if needed
      .getMany();
  }

  async getOrderHistory(userId: string): Promise<Order[]> {
    return this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .withDeleted()
      .getMany();
  }

  async getOrderById(id: string, requesterId: string, requesterRole?: string): Promise<Order> {
    const order = await this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.rider', 'rider')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.id = :id', { id })
      .withDeleted()
      .getOne();

    if (!order) throw new NotFoundException('Order not found');

    // Access Control:
    // 1. Owner of the order can see it.
    // 2. Assigned rider can see it.
    // 3. Any rider can see it if it's still 'pending'.
    const isOwner = order.userId === requesterId;
    const isAssignedRider = order.riderId === requesterId;
    const isRiderViewingPending = requesterRole === 'rider' && order.status === 'pending';

    if (!isOwner && !isAssignedRider && !isRiderViewingPending) {
      throw new UnauthorizedException('Access denied to this order');
    }

    return order;
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const oldStatus = order.status;
    if (oldStatus === 'cancelled') {
        throw new BadRequestException('Cannot update status of a cancelled order');
    }
    order.status = status;
    const updatedOrder = await this.ordersRepository.save(order);
    
    // Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: id, status: status })
    );

    // If order is delivered, update rider's total earnings
    if (status === 'delivered' && oldStatus !== 'delivered' && order.riderId) {
      const riderRepo = this.ordersRepository.manager.getRepository('Rider');
      const rider = await riderRepo.findOne({ where: { id: order.riderId } }) as any;
      if (rider) {
        rider.totalEarnings = Number(rider.totalEarnings || 0) + Number(order.total);
        await riderRepo.save(rider);
      }
    }

    // Emit real-time update
    this.ordersGateway.emitOrderStatusUpdate(id, status, order.userId);
    
    return updatedOrder;
  }

  async cancelOrder(id: string, userId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found or access denied');

    if (order.status === 'out_for_delivery' || order.status === 'delivered') {
      throw new BadRequestException('Order cannot be cancelled. It is already out for delivery or delivered.');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled.');
    }

    order.status = 'cancelled';
    const updatedOrder = await this.ordersRepository.save(order);

    // Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: id, status: 'cancelled', notes: 'Cancelled by customer' })
    );

    // Notify User and Rider
    this.ordersGateway.emitOrderStatusUpdate(id, 'cancelled', userId, order.riderId);

    return updatedOrder;
  }

  async getOrderStatusTimeline(orderId: string): Promise<OrderHistory[]> {
    return this.orderHistoryRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async reorderOrder(id: string, userId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
    });
    if (!order) throw new NotFoundException('Order not found or access denied');
    if (order.status !== 'cancelled') {
      throw new BadRequestException('Only cancelled orders can be reordered.');
    }

    // Restore the same order back to pending
    order.status = 'pending';
    const updatedOrder = await this.ordersRepository.save(order);

    // Emit real-time update so tracking screen reflects instantly
    this.ordersGateway.emitOrderStatusUpdate(id, 'pending', userId);

    return updatedOrder;
  }

  async removeOrderItem(orderId: string, itemId: string, userId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException('Order not found or access denied');

    // Only allow removal while pending or confirmed (un-prepared)
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new BadRequestException(`Cannot remove items when order is ${order.status}`);
    }

    const itemToRemove = order.items.find(i => i.id === itemId);
    if (!itemToRemove) throw new NotFoundException('Item not found in this order');

    const itemTotal = Number(itemToRemove.priceAtTime) * itemToRemove.quantity;

    // Delete item
    await this.orderItemsRepository.delete(itemId);

    // Update order totals
    order.subtotal = Number(order.subtotal) - itemTotal;
    order.total = Number(order.total) - itemTotal;

    // Re-fetch items to check if empty
    const remainingItems = await this.orderItemsRepository.find({ where: { orderId } });
    if (remainingItems.length === 0) {
      order.status = 'cancelled';
      order.total = 0;
      order.subtotal = 0;
      this.ordersGateway.emitOrderStatusUpdate(orderId, 'cancelled');
    }

    const updatedOrder = await this.ordersRepository.save(order);
    
    if (remainingItems.length === 0) {
      await this.ordersRepository.delete(orderId);
      return { ...updatedOrder, deleted: true } as any;
    }

    // Notify tracking screen to refresh
    this.ordersGateway.emitOrderStatusUpdate(orderId, updatedOrder.status);

    return updatedOrder;
  }

  async updateItemQuantity(orderId: string, itemId: string, quantity: number): Promise<any> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items']
    });

    if (!order) throw new NotFoundException('Order not found');
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new Error('Cannot modify order in current status');
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found');

    if (quantity <= 0) {
      // Remove item
      order.items = order.items.filter(i => i.id !== itemId);
      await this.ordersRepository.manager.delete('OrderItem', itemId);
    } else {
      item.quantity = quantity;
      await this.ordersRepository.manager.save(item);
    }

    // Recalculate totals
    const remainingItems = order.items;
    if (remainingItems.length === 0) {
      await this.ordersRepository.delete(orderId);
      return { deleted: true };
    }

    let subtotal = 0;
    remainingItems.forEach(i => {
      subtotal += Number(i.priceAtTime) * i.quantity;
    });

    order.subtotal = subtotal;
    order.total = Number(subtotal) + Number(order.deliveryFee) - Number(order.discountAmount);
    const updatedOrder = await this.ordersRepository.save(order);

    // Notify tracking screen
    this.ordersGateway.emitOrderStatusUpdate(orderId, updatedOrder.status);

    return updatedOrder;
  }

  async batchUpdateItems(orderId: string, items: { itemId: string; quantity: number }[]): Promise<any> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException(`Cannot modify order when it is ${order.status}`);
    }

    const itemIdsToRemove: string[] = [];
    const itemsToUpdate: OrderItem[] = [];

    for (const update of items) {
      const existingItem = order.items.find(i => i.id === update.itemId);
      if (!existingItem) continue;

      if (update.quantity <= 0) {
        itemIdsToRemove.push(update.itemId);
      } else {
        existingItem.quantity = update.quantity;
        itemsToUpdate.push(existingItem);
      }
    }

    // Process removals
    if (itemIdsToRemove.length > 0) {
      await this.orderItemsRepository.delete(itemIdsToRemove);
      order.items = order.items.filter(i => !itemIdsToRemove.includes(i.id));
    }

    // Process updates
    if (itemsToUpdate.length > 0) {
      await this.orderItemsRepository.save(itemsToUpdate);
    }

    // Recalculate totals
    if (order.items.length === 0) {
      await this.ordersRepository.delete(orderId);
      this.ordersGateway.emitOrderStatusUpdate(orderId, 'cancelled');
      return { deleted: true };
    }

    let subtotal = 0;
    order.items.forEach(i => {
      subtotal += Number(i.priceAtTime) * i.quantity;
    });

    order.subtotal = subtotal;
    order.total = Number(subtotal) + Number(order.deliveryFee) - Number(order.discountAmount);
    
    const updatedOrder = await this.ordersRepository.save(order);

    // Notify tracking screen
    this.ordersGateway.emitOrderStatusUpdate(orderId, updatedOrder.status);

    return updatedOrder;
  }

  async calculateDeliveryFee(addressId: string) {
    const address = await this.addressesService.findOne(addressId);
    if (!address) {
      return {
        isValid: false,
        deliveryFee: 0,
        distance: -1,
        message: 'Invalid address',
      };
    }

    const lat = Number(address.latitude);
    const lng = Number(address.longitude);

    console.log(`Calculating fee for Address: ${addressId} at (${lat}, ${lng})`);

    const validation = await this.deliveryZonesService.validateAddressInZone(lat, lng);
    
    if (!validation.isValid) {
      console.warn(`Delivery validation failed for Address: ${addressId}. Distance: ${validation.distance}`);
      return {
        isValid: false,
        deliveryFee: 0,
        distance: validation.distance,
        message: 'Delivery not available for this location. You might be outside our 50km service zone.',
      };
    }

    const baseFee = await this.settingsService.getNumber('delivery_base_fee', 150);
    const threshold = await this.settingsService.getNumber('delivery_threshold_km', 3);
    const perKmFee = await this.settingsService.getNumber('delivery_per_km_fee', 20);

    let deliveryFee = baseFee;
    const distanceVal = Number(validation.distance);
    
    if (distanceVal > threshold) {
      const extraKm = distanceVal - threshold;
      deliveryFee += extraKm * perKmFee;
    }

    console.log(`Delivery Fee calculated: ${deliveryFee} for distance: ${distanceVal}km`);

    return {
      isValid: true,
      deliveryFee: Math.round(deliveryFee),
      distance: distanceVal,
      message: 'Service is available.',
    };
  }
}
