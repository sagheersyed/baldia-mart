import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException, Query, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderHistory } from './order-history.entity';
import { SubOrder } from './sub-order.entity';
import { OrderChatMessage } from './order-chat-message.entity';
import { CartService } from '../cart/cart.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { AddressesService } from '../addresses/addresses.service';
import { SettingsService } from '../settings/settings.service';
import { OrdersGateway } from './orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Rider } from '../riders/rider.entity';
import { RidersService } from '../riders/riders.service';
import { VendorsService } from '../vendors/vendors.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderHistory) private orderHistoryRepository: Repository<OrderHistory>,
    @InjectRepository(Rider) private ridersRepository: Repository<Rider>,
    @InjectRepository(SubOrder) private subOrdersRepository: Repository<SubOrder>,
    @InjectRepository(OrderChatMessage) private chatMessagesRepository: Repository<OrderChatMessage>,
    private cartService: CartService,
    private deliveryZonesService: DeliveryZonesService,
    private addressesService: AddressesService,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => RidersService))
    private ridersService: RidersService,
    private vendorsService: VendorsService,
  ) { }

  private isBusinessOpen(openingTime: string | null, closingTime: string | null): boolean {
    if (!openingTime || !closingTime) return true;
    try {
      const now = new Date();
      const [openH, openM] = openingTime.split(':').map(Number);
      const [closeH, closeM] = closingTime.split(':').map(Number);
      const openTime = new Date(now); openTime.setHours(openH, openM, 0, 0);
      const closeTime = new Date(now); closeTime.setHours(closeH, closeM, 0, 0);
      if (closeTime < openTime) {
        return now >= openTime || now <= closeTime;
      }
      return now >= openTime && now <= closeTime;
    } catch (e) {
      console.warn('Error parsing business hours', e);
      return true;
    }
  }

  async placeOrder(userId: string, addressId: string, paymentMethod: string, notes?: string, items?: any[], orderType: string = 'mart', restaurantId?: string): Promise<Order> {
    console.log('--- PlaceOrder Debug ---');
    console.log('UserId:', userId);
    console.log('AddressId:', addressId);
    console.log('OrderType:', orderType);
    if (restaurantId) console.log('Legacy RestaurantId:', restaurantId);

    // 1. Get cart items with correct entity fetching
    let cartItems: any[] = [];
    if (items && items.length > 0) {
      for (const item of items) {
        if (orderType === 'food' && item.menuItemId) {
          const menuItem = await this.orderItemsRepository.manager.getRepository('MenuItem').findOne({ where: { id: item.menuItemId }, relations: ['restaurant'] }) as any;
          if (menuItem) {
            cartItems.push({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              product: menuItem,
              restaurantId: menuItem.restaurantId,
              restaurant: menuItem.restaurant
            });
          }
        } else if (item.productId) {
          const product = await this.orderItemsRepository.manager.getRepository('Product').findOne({ 
            where: { id: item.productId },
            relations: ['brand', 'category']
          }) as any;
          if (product) {
            cartItems.push({
              productId: item.productId,
              quantity: item.quantity,
              product: product
            });
          }
        }
      }
    } else {
      cartItems = await this.cartService.getCartByUserId(userId);
      if (orderType === 'food') {
        for (const item of cartItems) {
          if (item.menuItemId) {
            const menuItem = await this.orderItemsRepository.manager.getRepository('MenuItem').findOne({ where: { id: item.menuItemId }, relations: ['restaurant'] }) as any;
            if (menuItem) {
              item.product = menuItem;
              item.restaurantId = menuItem.restaurantId;
              item.restaurant = menuItem.restaurant;
            }
          }
        }
      } else {
        for (const item of cartItems) {
          if (item.productId) {
            const product = await this.orderItemsRepository.manager.getRepository('Product').findOne({ 
              where: { id: item.productId },
              relations: ['brand', 'category']
            }) as any;
            if (product) item.product = product;
          }
        }
      }
    }

    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    // 1.5 Validate Max Quantity & Business Hours (Hierarchical)
    for (const item of cartItems) {
      const entity = item.product; 
      
      // A. Max Quantity Check
      if (entity && entity.maxQuantityPerOrder > 0 && item.quantity > entity.maxQuantityPerOrder) {
        throw new BadRequestException(
          `Quantity limit exceeded for ${entity.name}. Maximum allowed per order is ${entity.maxQuantityPerOrder}.`
        );
      }

      // B. Business Hours Check (Hierarchy: Product > Brand > Category)
      // Note: Vendor (Mart/Restaurant) check happens after martId/dist check
      if (orderType === 'mart') {
        const product = entity;
        const brand = product.brand;
        const category = product.category;

        if (category && !this.isBusinessOpen(category.openingTime, category.closingTime)) {
          throw new BadRequestException(`Category '${category.name}' is currently closed.`);
        }
        if (brand && !this.isBusinessOpen(brand.openingTime, brand.closingTime)) {
          throw new BadRequestException(`Brand '${brand.name}' is currently closed.`);
        }
        if (!this.isBusinessOpen(product.openingTime, product.closingTime)) {
          throw new BadRequestException(`Product '${product.name}' is currently unavailable.`);
        }
      }
    }

    // 2. Validate Address
    const address = await this.addressesService.findOne(addressId);
    if (!address || address.userId !== userId) throw new BadRequestException('Invalid address');

    // 3. Multi-Restaurant & Pickup Logistics
    let pickupLat = 24.91522600; // Default Baldia Mart
    let pickupLng = 66.96431980;
    let martId = null;
    let distinctRestaurants: any[] = [];
    let multiStopSurcharge = 0;

    if (orderType === 'food') {
      const restoMap = new Map();
      for (const item of cartItems) {
        if (item.restaurantId && item.restaurant && !restoMap.has(item.restaurantId)) {
          restoMap.set(item.restaurantId, item.restaurant);
        }
      }
      distinctRestaurants = Array.from(restoMap.values());

      if (distinctRestaurants.length > 0) {
        // Validate operating hours for ALL involved restaurants
        for (const restaurant of distinctRestaurants) {
          if (restaurant.openingHours) {
            try {
              const [openStr, closeStr] = restaurant.openingHours.split('-').map((s: string) => s.trim());
              const parseTime = (timeStr: string) => {
                const match = timeStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
                if (!match) return null;
                let hours = parseInt(match[1], 10);
                const minutes = parseInt(match[2], 10);
                const period = match[3]?.toUpperCase();
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                const d = new Date();
                d.setHours(hours, minutes, 0, 0);
                return d;
              };
              const openTime = parseTime(openStr);
              const closeTime = parseTime(closeStr);
              const now = new Date();

              if (openTime && closeTime) {
                if (closeTime < openTime) {
                  if (now < openTime && now > closeTime) {
                    throw new BadRequestException(`Restaurant ${restaurant.name} is currently closed.`);
                  }
                } else if (now < openTime || now > closeTime) {
                  throw new BadRequestException(`Restaurant ${restaurant.name} is currently closed.`);
                }
              }
            } catch (e) {
              if (e instanceof BadRequestException) throw e;
            }
          }
        }

        // Validate Multi-Restaurant Logic (Distance & Prep Time)
        if (distinctRestaurants.length > 1) {
          for (let i = 0; i < distinctRestaurants.length; i++) {
            for (let j = i + 1; j < distinctRestaurants.length; j++) {
              const r1 = distinctRestaurants[i];
              const r2 = distinctRestaurants[j];
              const dist = this.deliveryZonesService.calculateDistance(Number(r1.latitude), Number(r1.longitude), Number(r2.latitude), Number(r2.longitude));

              const maxDist = await this.settingsService.getNumber('multi_restaurant_max_distance_km', 0.4);
              if (dist > maxDist) {
                throw new BadRequestException(`Multi-restaurant orders are only allowed for restaurants within ${(maxDist * 1000).toFixed(0)} meters of each other.`);
              }
              const prep1 = r1.prepTimeMinutes || 20;
              const prep2 = r2.prepTimeMinutes || 20;
              if (Math.abs(prep1 - prep2) > 10) {
                throw new BadRequestException('Preparation time difference between selected restaurants is too high.');
              }
            }
          }
          multiStopSurcharge = (distinctRestaurants.length - 1) * 50;
        }

        const primaryResto = distinctRestaurants[0];
        if (primaryResto.latitude && primaryResto.longitude) {
          pickupLat = Number(primaryResto.latitude);
          pickupLng = Number(primaryResto.longitude);
        }
      }
    } else {
      // Find nearest mart for Mart orders
      try {
        const martsStr = await this.settingsService.getByKey('mart_locations_list', '[]');
        const marts = JSON.parse(martsStr || '[]');
        if (marts && marts.length > 0) {
          let minDist = Infinity;
          for (const mart of marts) {
            if (mart.lat && mart.lng) {
              const dist = this.deliveryZonesService.calculateDistance(Number(address.latitude), Number(address.longitude), Number(mart.lat), Number(mart.lng));
              if (dist < minDist) {
                minDist = dist;
                martId = mart.id;
                pickupLat = Number(mart.lat);
                pickupLng = Number(mart.lng);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to calculate nearest mart', err);
      }
    }

    // Dynamic Delivery Fee
    const pricing = await this.calculateDeliveryFeeFromCoords(Number(address.latitude), Number(address.longitude), pickupLat, pickupLng);
    if (!pricing.isValid) {
      throw new BadRequestException(`Delivery not available: ${pricing.message}`);
    }
    const finalDeliveryFee = pricing.deliveryFee + multiStopSurcharge;

    // 3.5 Validate Vendor Hours (Fulfillment Center)
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    if (orderType === 'mart' && martId && isUuid(martId)) {
      try {
        const vendor = await this.orderItemsRepository.manager.getRepository('Vendor').findOne({ where: { id: martId } }) as any;
        if (vendor && !this.isBusinessOpen(vendor.openingTime, vendor.closingTime)) {
          throw new BadRequestException(`Fulfillment center '${vendor.name}' is currently closed.`);
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        console.warn('Failed to check fulfillment center vendor status', err);
      }
    }

    // 4. Calculate Subtotal
    let subtotal = 0;
    for (const item of cartItems) {
      const itemPrice = Number(item.product.price) - Number(item.product.discount || 0);
      subtotal += itemPrice * item.quantity;
    }

    // 5. Create Parent Order
    let orderBrandId = undefined;
    if (orderType === 'mart') {
      const brandItem = cartItems.find(i => i.product && i.product.brandId);
      if (brandItem) orderBrandId = brandItem.product.brandId;
    }

    const order = this.ordersRepository.create({
      userId,
      addressId,
      martId: (martId && isUuid(martId)) ? martId : undefined,
      restaurantId: orderType === 'food' && distinctRestaurants.length === 1 ? distinctRestaurants[0].id : undefined,
      brandId: orderBrandId,
      subtotal,
      deliveryFee: finalDeliveryFee,
      total: subtotal + finalDeliveryFee,
      paymentMethod,
      deliveryDistanceKm: pricing.distance,
      notes,
      orderType,
    });
    const savedOrder = await this.ordersRepository.save(order);

    // 6. Create SubOrders and OrderItems
    if (orderType === 'food' && distinctRestaurants.length > 0) {
      for (const resto of distinctRestaurants) {
        const restoItems = cartItems.filter(i => i.restaurantId === resto.id);
        const restoSubtotal = restoItems.reduce((acc, item) => {
          const price = Number(item.product.price) - Number(item.product.discount || 0);
          return acc + (price * item.quantity);
        }, 0);

        const subOrder = this.subOrdersRepository.create({
          orderId: savedOrder.id,
          restaurantId: resto.id,
          status: 'pending',
          subtotal: restoSubtotal,
          estimatedPrepTimeMinutes: Math.max(...restoItems.map(i => (i.product as any)?.prepTimeMinutes || 0), resto.prepTimeMinutes || 20)
        });
        const savedSubOrder = await this.subOrdersRepository.save(subOrder);

        const orderItemsToSave = restoItems.map(item => this.orderItemsRepository.create({
          orderId: savedOrder.id,
          subOrderId: savedSubOrder.id,
          menuItemId: item.menuItemId,
          // productId should remain undefined for food orders because item.product is aliased to menuItem
          productId: undefined,
          quantity: item.quantity,
          priceAtTime: Number(item.product.price) - Number(item.product.discount || 0)
        }));
        await this.orderItemsRepository.save(orderItemsToSave);
      }
    } else {
      // For Mart orders, just save the items; syncSubOrdersInternal will group them into SubOrders
      const orderItemsToSave = cartItems.map(item => this.orderItemsRepository.create({
        orderId: savedOrder.id,
        productId: item.productId || (item.product?.id),
        quantity: item.quantity,
        priceAtTime: Number(item.product.price) - Number(item.product.discount || 0)
      }));
      await this.orderItemsRepository.save(orderItemsToSave);
    }

    // 6. Split into Sub-Orders (Refactored to private method for re-use)
    await this.syncSubOrdersInternal(this.ordersRepository.manager, savedOrder.id);

    // 7. Clear Cart if it was stored in DB
    if (!items) {
      await this.cartService.clearCart(userId);
    }

    // 8. Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: savedOrder.id, status: 'pending', notes: 'Order placed' })
    );

    // 9. Broadcast
    const orderWithDetails = await this.ordersRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'items.product', 'items.menuItem', 'address', 'user', 'subOrders', 'subOrders.restaurant', 'subOrders.vendor']
    });

    if (orderWithDetails && orderWithDetails.restaurantId) {
      (orderWithDetails as any).restaurant = await this.orderItemsRepository.manager.getRepository('Restaurant').findOne({ where: { id: orderWithDetails.restaurantId } });
    }

    if (orderWithDetails) {
      // Instantly notify admin of the new order
      this.ordersGateway.emitNewOrderToAdmin(orderWithDetails);

      if (orderType === 'food' && distinctRestaurants.length > 0) {
        // Delayed Dispatch Logic
        let maxPrepTime = 0;
        for (const r of distinctRestaurants) {
          const pt = r.prepTimeMinutes || 20;
          if (pt > maxPrepTime) maxPrepTime = pt;
        }

        const estimatedRiderTravelTime = 10; // Generic 10 mins ETA for a rider to arrive at the restaurant
        const safetyBuffer = 2; // ping 2 mins earlier than strictly needed

        const delayMinutes = maxPrepTime - estimatedRiderTravelTime - safetyBuffer;

        if (delayMinutes > 0) {
          console.log(`[Smart Logistics] Delaying rider dispatch for ${delayMinutes} minutes to ensure food is fresh for Order ${savedOrder.id}.`);
          setTimeout(async () => {
            this.ordersGateway.emitNewOrderToRiders(orderWithDetails);
            this.notifyOnlineRiders(orderWithDetails);
          }, delayMinutes * 60 * 1000);
        } else {
          // Dispatch immediately
          this.ordersGateway.emitNewOrderToRiders(orderWithDetails);
          this.notifyOnlineRiders(orderWithDetails);
        }
      } else {
        // Mart Orders dispatch immediately
        this.ordersGateway.emitNewOrderToRiders(orderWithDetails);
        this.notifyOnlineRiders(orderWithDetails);
      }
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
    return this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .where('order.status = :status', { status: 'pending' })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getAllOrdersForAdmin(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'items.product', 'address', 'user', 'rider', 'subOrders', 'subOrders.restaurant', 'subOrders.vendor'],
      order: { createdAt: 'DESC' }
    });
  }

  async getRiderOrderHistory(riderId: string): Promise<Order[]> {
    return this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .leftJoinAndSelect('subOrders.vendor', 'subOrderVendor')
      .where('order.riderId = :riderId', { riderId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['delivered', 'cancelled'] })
      .orderBy('order.updatedAt', 'DESC')
      .withDeleted() // Ensure we see orders even if address/products are soft-deleted
      .getMany();
  }

  async acceptOrder(orderId: string, riderId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['rider']
    });

    if (!order) throw new NotFoundException('Order not found');

    // Check if rider is blocked or out of zone
    const riderRepo = this.ordersRepository.manager.getRepository('Rider');
    const rider = await riderRepo.findOne({ where: { id: riderId } }) as any;
    if (!rider || rider.isActive === false) {
      throw new ForbiddenException('Your account has been blocked. Please contact support.');
    }

    // Zone Enforcement
    if (!rider.currentLat || !rider.currentLng) {
      throw new BadRequestException('Please enable location services and stay online to accept orders.');
    }

    const zoneCheck = await this.deliveryZonesService.validateAddressInZone(
      Number(rider.currentLat),
      Number(rider.currentLng)
    );

    if (!zoneCheck.isValid) {
      throw new BadRequestException('You are outside the active delivery zone. Please move closer to a service area to accept orders.');
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
      this.orderHistoryRepository.create({ orderId, status: order.status, notes: `Admin manually assigned rider #${riderId.slice(0, 8)}` })
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
      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .leftJoinAndSelect('subOrders.vendor', 'subOrderVendor')
      .where('order.riderId = :riderId', { riderId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['confirmed', 'preparing', 'out_for_delivery'] })
      .orderBy('order.updatedAt', 'DESC')
      .withDeleted()
      .getMany();
  }

  async getOrderHistory(userId: string, page = 1, limit = 20): Promise<Order[]> {
    return this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .withDeleted()
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  async getOrderById(id: string, requesterId: string, requesterRole?: string): Promise<Order> {
    const order = await this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('menuItem.restaurant', 'menuItemRestaurant')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.rider', 'rider')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .leftJoinAndSelect('subOrders.vendor', 'subOrderVendor')
      .where('order.id = :id', { id })
      .withDeleted()
      .getOne();

    if (!order) throw new NotFoundException('Order not found');

    // Access Control:
    // 1. Owner of the order can see it.
    // 2. Assigned rider can see it.
    // 3. Any rider can see it if it's 'pending' or 'confirmed' AND not yet assigned to another rider.
    const isOwner = order.userId === requesterId;
    const isAssignedRider = order.riderId === requesterId;
    const isRiderInAcceptanceFlow = requesterRole === 'rider' &&
      (order.status === 'pending' || order.status === 'confirmed') &&
      (!order.riderId || order.riderId === requesterId);

    if (!isOwner && !isAssignedRider && !isRiderInAcceptanceFlow) {
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
        // Rider only gets the delivery fee, not the total order amount
        rider.totalEarnings = Number(rider.totalEarnings || 0) + Number(order.deliveryFee);
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

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled.');
    }

    // Only allow cancellation for the first 2 steps: pending & confirmed
    // Once the mart starts preparing, the order cannot be cancelled by the customer
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        'This order can no longer be cancelled. It is already being prepared or out for delivery.'
      );
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
    this.ordersGateway.emitOrderStatusUpdate(id, 'pending', userId, order.riderId);

    return updatedOrder;
  }

  async removeOrderItem(orderId: string, itemId: string, requesterId: string, requesterRole?: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.userId === requesterId;
    const isAssignedRider = order.riderId === requesterId;
    const isRiderInFlow = requesterRole === 'rider' && (order.status === 'pending' || order.status === 'confirmed');

    if (!isOwner && !isAssignedRider && !isRiderInFlow) {
      throw new NotFoundException('Order not found or access denied');
    }

    if (order.orderType === 'food') {
      throw new BadRequestException('Food order items cannot be removed after checkout.');
    }

    // Only allow removal while pending or confirmed (un-prepared)
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new BadRequestException(`Cannot remove items when order is ${order.status}`);
    }

    const itemToRemove = order.items.find(i => i.id === itemId);
    if (!itemToRemove) throw new NotFoundException('Item not found in this order');

    // Mark as missing instead of deleting
    itemToRemove.status = 'missing';
    await this.orderItemsRepository.save(itemToRemove);

    // Recalculate totals based on active items only
    const activeItems = order.items.filter(i => i.status === 'active' || i.id === itemId ? i.status === 'active' : true); 
    // Wait, it's easier to just fetch them again
    const allItems = await this.orderItemsRepository.find({ where: { orderId: order.id } });
    const remainingActiveItems = allItems.filter(i => i.status === 'active');

    let newSubtotal = 0;
    remainingActiveItems.forEach(i => {
      newSubtotal += Number(i.priceAtTime) * i.quantity;
    });

    order.subtotal = newSubtotal;
    // Total includes delivery fee + subtotal
    order.total = newSubtotal + Number(order.deliveryFee);

    if (remainingActiveItems.length === 0) {
      order.status = 'cancelled';
      order.notes = (order.notes ? order.notes + '\n' : '') + 'Cancelled: All items marked as missing.';
      order.total = 0; 
      // Keep subtotal as 0 but keep delivery fee record if needed? 
      // Usually if cancelled, total is effectively 0.
      this.ordersGateway.emitOrderStatusUpdate(orderId, 'cancelled', order.userId, order.riderId);
    }

    const updatedOrder = await this.ordersRepository.save(order);

    // Notify tracking screen and rider
    await this.emitUpdateNotifications(orderId, updatedOrder.status, requesterId, updatedOrder.riderId);

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

    // Sync sub-orders for routing
    await this.syncSubOrdersInternal(this.ordersRepository.manager, orderId);

    const updatedOrder = await this.ordersRepository.save(order);

    // Notify tracking screen and rider
    await this.emitUpdateNotifications(orderId, updatedOrder.status, order.userId, updatedOrder.riderId);

    return updatedOrder;
  }

  async batchUpdateItems(orderId: string, items: { itemId: string; quantity: number }[]): Promise<any> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
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
        const product = existingItem.product;
        if (!product) continue;

        if (product.maxQuantityPerOrder > 0 && update.quantity > product.maxQuantityPerOrder) {
          throw new BadRequestException(
            `Quantity limit exceeded for ${product.name}. Maximum allowed per order is ${product.maxQuantityPerOrder}.`
          );
        }

        if (product.stockQuantity < update.quantity) {
          throw new BadRequestException(
            `Not enough stock for ${product.name}. Only ${product.stockQuantity} units available.`
          );
        }

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

    // Sync sub-orders for routing
    await this.syncSubOrdersInternal(this.ordersRepository.manager, orderId);

    const updatedOrder = await this.ordersRepository.save(order);

    // Notify tracking screen and rider
    await this.emitUpdateNotifications(orderId, updatedOrder.status, order.userId, updatedOrder.riderId);

    return updatedOrder;
  }



  async addItemToOrder(orderId: string, userId: string, productId: string, quantity: number): Promise<Order> {
    return this.ordersRepository.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.userId !== userId) throw new ForbiddenException('Access denied');

      if (order.orderType === 'food') {
        throw new BadRequestException('Cannot add items to a food order after checkout.');
      }

      const editableStatuses = ['pending', 'confirmed'];
      if (!editableStatuses.includes(order.status)) {
        throw new BadRequestException('Items can only be added while the order is pending or confirmed.');
      }

      // Fetch product to get current price and check stock & business hours
      const product = await manager.getRepository('Product').findOne({ 
        where: { id: productId },
        relations: ['brand', 'category']
      }) as any;
      if (!product) throw new NotFoundException('Product not found');

      // Hierarchical Business Hour Check
      const brand = product.brand;
      const category = product.category;

      if (category && !this.isBusinessOpen(category.openingTime, category.closingTime)) {
        throw new BadRequestException(`Category '${category.name}' is currently closed.`);
      }
      if (brand && !this.isBusinessOpen(brand.openingTime, brand.closingTime)) {
        throw new BadRequestException(`Brand '${brand.name}' is currently closed.`);
      }
      if (!this.isBusinessOpen(product.openingTime, product.closingTime)) {
        throw new BadRequestException(`Product '${product.name}' is currently unavailable.`);
      }

      // Quantity Limit Check
      const existingItem = order.items.find(i => i.productId === productId);
      const currentQty = existingItem ? existingItem.quantity : 0;
      const totalNewQty = currentQty + quantity;

      if (product.maxQuantityPerOrder > 0 && totalNewQty > product.maxQuantityPerOrder) {
        throw new BadRequestException(
          `Quantity limit exceeded for ${product.name}. Maximum allowed per order is ${product.maxQuantityPerOrder}.`
        );
      }

      if (product.stockQuantity < quantity) {
        throw new BadRequestException(`Only ${product.stockQuantity} units available in stock.`);
      }

      const unitPrice = Number(product.price) - Number(product.discount || 0);

      // Check if product already exists in this order
      let item = order.items.find(i => i.productId === productId);

      if (item) {
        item.quantity += quantity;
        await manager.save(OrderItem, item);
      } else {
        // Explicitly create with IDs to avoid relation sync issues
        item = manager.create(OrderItem, {
          order: { id: orderId } as any, // Use relation object for TypeORM preference
          orderId: orderId,
          product: { id: productId } as any,
          productId: productId,
          quantity,
          priceAtTime: unitPrice,
        });
        await manager.save(OrderItem, item);
      }

      // Recalculate totals from all items in this order
      const allItems = await manager.find(OrderItem, { where: { orderId } });
      const subtotal = allItems.reduce((sum, i) => sum + Number(i.priceAtTime) * i.quantity, 0);

      const subtotalVal = Number(subtotal);
      const deliveryFee = Number(order.deliveryFee);
      const discountAmount = Number(order.discountAmount || 0);
      const total = subtotalVal + deliveryFee - discountAmount;

      // Use explicit update to Order to ensure consistency without full entity save cascades
      await manager.update(Order, orderId, {
        subtotal: subtotalVal,
        total: total,
      });

      // Sync sub-orders for routing
      await this.syncSubOrdersInternal(manager, orderId);

      // Notify through gateway and push notifications
      await this.emitUpdateNotifications(orderId, order.status, userId, order.riderId ?? undefined);

      const finalOrder = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.product', 'address'],
      });

      if (!finalOrder) throw new NotFoundException('Order not found after update');
      return finalOrder;
    });
  }

  async calculateDeliveryFee(addressId: string, restaurantId?: string) {
    const address = await this.addressesService.findOne(addressId);
    if (!address) {
      return {
        isValid: false,
        deliveryFee: 0,
        distance: -1,
        message: 'Invalid address',
      };
    }

    // Default to mart pickup for preview
    let pickupLat = 24.91522600;
    let pickupLng = 66.96431980;

    if (restaurantId) {
      const restaurant = await this.orderItemsRepository.manager.getRepository('Restaurant').findOne({ where: { id: restaurantId } }) as any;
      if (restaurant && restaurant.latitude && restaurant.longitude) {
        pickupLat = Number(restaurant.latitude);
        pickupLng = Number(restaurant.longitude);
      }
    } else {
      try {
        const martsStr = await this.settingsService.getByKey('mart_locations_list', '[]');
        const marts = JSON.parse(martsStr || '[]');
        if (marts && marts.length > 0) {
          let minDist = Infinity;
          for (const mart of marts) {
            if (mart.lat && mart.lng) {
              const dist = this.deliveryZonesService.calculateDistance(Number(address.latitude), Number(address.longitude), Number(mart.lat), Number(mart.lng));
              if (dist < minDist) {
                minDist = dist;
                pickupLat = Number(mart.lat);
                pickupLng = Number(mart.lng);
              }
            }
          }
        }
      } catch (err) { }
    }

    return this.calculateDeliveryFeeFromCoords(Number(address.latitude), Number(address.longitude), pickupLat, pickupLng);
  }

  async calculateDeliveryFeeFromCoords(custLat: number, custLng: number, pickupLat: number, pickupLng: number) {
    console.log(`Calculating fee: Customer (${custLat}, ${custLng}) to Pickup (${pickupLat}, ${pickupLng})`);

    const validation = await this.deliveryZonesService.validateAddressInZone(custLat, custLng);

    if (!validation.isValid) {
      const maxRad = (validation as any).maxRadius || 50;
      return {
        isValid: false,
        deliveryFee: 0,
        distance: validation.distance,
        message: `Delivery not available for this location. You might be outside our ${maxRad}km service zone.`,
      };
    }

    // Calculate actual distance from pickup point instead of just zone center
    const realDistance = this.deliveryZonesService.calculateDistance(custLat, custLng, pickupLat, pickupLng);

    const baseFee = await this.settingsService.getNumber('delivery_base_fee', 150);
    const threshold = await this.settingsService.getNumber('delivery_threshold_km', 3);
    const perKmFee = await this.settingsService.getNumber('delivery_per_km_fee', 20);

    let deliveryFee = baseFee;

    if (realDistance > threshold) {
      const extraKm = realDistance - threshold;
      deliveryFee += extraKm * perKmFee;
    }

    console.log(`Delivery Fee calculated: ${deliveryFee} for distance: ${realDistance}km`);

    return {
      isValid: true,
      deliveryFee: Math.round(deliveryFee),
      distance: realDistance,
      message: 'Service is available.',
    };
  }

  private async syncSubOrdersInternal(manager: any, orderId: string) {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.menuItem', 'address'],
    });
    if (!order) return;

    // Get existing sub-orders to sync instead of blind delete
    const existingSubOrders = await manager.find(SubOrder, { where: { orderId } });
    const existingMap = new Map();
    existingSubOrders.forEach(s => {
      const key = order.orderType === 'food' ? s.restaurantId : s.vendorId;
      existingMap.set(key, s);
    });

    const activeKeys = new Set();
    const subOrderDataMap = new Map();

    if (order.orderType === 'food') {
      for (const item of order.items) {
        let restaurantId = null;
        if (item.menuItem && item.menuItem.restaurantId) {
          restaurantId = item.menuItem.restaurantId;
        } else if (item.menuItemId) {
          const mItem = await manager.getRepository('MenuItem').findOne({ where: { id: item.menuItemId } });
          if (mItem) restaurantId = mItem.restaurantId;
        }
        
        if (restaurantId) {
          activeKeys.add(restaurantId);
          if (!subOrderDataMap.has(restaurantId)) {
            subOrderDataMap.set(restaurantId, { items: [], id: restaurantId });
          }
          subOrderDataMap.get(restaurantId).items.push(item);
        }
      }
    } else {
      for (const item of order.items) {
        const vendorProduct = await this.vendorsService.findBestVendorForProduct(
          item.productId, 
          Number(order.address.latitude), 
          Number(order.address.longitude)
        );
        if (vendorProduct) {
          activeKeys.add(vendorProduct.vendorId);
          if (!subOrderDataMap.has(vendorProduct.vendorId)) {
            subOrderDataMap.set(vendorProduct.vendorId, { 
              items: [], 
              id: vendorProduct.vendorId,
              lat: Number(vendorProduct.vendor.lat),
              lng: Number(vendorProduct.vendor.lng) 
            });
          }
          subOrderDataMap.get(vendorProduct.vendorId).items.push({ ...item, vendorProductId: vendorProduct.id });
        }
      }
    }

    // Optimize sequences for Mart orders
    let sequenceMap = new Map();
    if (order.orderType !== 'food' && subOrderDataMap.size > 0) {
      const coords = Array.from(subOrderDataMap.values()).map(v => ({
        vendorId: v.id, lat: v.lat, lng: v.lng,
      }));
      const sequence = this.vendorsService.optimizePickupSequence(coords, Number(order.address.latitude), Number(order.address.longitude));
      sequenceMap = new Map(sequence.map(s => [s.vendorId, s.sequence]));
    }

    // 1. Delete sub-orders that are no longer needed
    for (const sub of existingSubOrders) {
      const key = order.orderType === 'food' ? sub.restaurantId : sub.vendorId;
      if (!activeKeys.has(key)) {
        await manager.delete(SubOrder, sub.id);
      }
    }

    // 2. Create or Update sub-orders
    for (const [key, data] of subOrderDataMap) {
      const subtotal = data.items.reduce((acc, i) => acc + (Number(i.priceAtTime) * i.quantity), 0);
      let subOrder = existingMap.get(key);
      
      if (subOrder) {
        // Update existing
        await manager.update(SubOrder, subOrder.id, {
          subtotal,
          pickupSequence: order.orderType === 'food' ? 1 : (sequenceMap.get(key) ?? 1),
        });
      } else {
        // Create new
        subOrder = manager.create(SubOrder, {
          orderId,
          restaurantId: order.orderType === 'food' ? key : undefined,
          vendorId: order.orderType !== 'food' ? key : undefined,
          status: 'pending',
          subtotal,
          pickupSequence: order.orderType === 'food' ? 1 : (sequenceMap.get(key) ?? 1),
        });
        subOrder = await manager.save(SubOrder, subOrder);
      }

      // Update item relationships
      for (const item of data.items) {
        await manager.update(OrderItem, item.id, { subOrderId: subOrder.id });
      }
    }
  }

  async updateSubOrderStatus(subOrderId: string, status: string): Promise<SubOrder> {
    const subOrder = await this.subOrdersRepository.findOne({
      where: { id: subOrderId },
      relations: ['order']
    });
    if (!subOrder) throw new NotFoundException('Sub-order not found');

    subOrder.status = status;
    const updatedSubOrder = await this.subOrdersRepository.save(subOrder);

    // Sync parent order based on sub-order status
    if (status === 'picked_up') {
      const allSubOrders = await this.subOrdersRepository.find({ where: { orderId: subOrder.orderId } });
      if (allSubOrders.every(s => s.status === 'picked_up' || s.status === 'delivered')) {
        await this.updateStatus(subOrder.orderId, 'out_for_delivery');
      }
    } else if (status === 'delivered') {
      const allSubOrders = await this.subOrdersRepository.find({ where: { orderId: subOrder.orderId } });
      if (allSubOrders.every(s => s.status === 'delivered')) {
        await this.updateStatus(subOrder.orderId, 'delivered');
      }
    }

    // Notify users
    this.ordersGateway.emitOrderStatusUpdate(subOrder.orderId, `sub_${status}`, subOrder.order.userId);

    return updatedSubOrder;
  }

  private async emitUpdateNotifications(orderId: string, status: string, userId: string, riderId?: string) {
    // Notify through gateway for tracking screens
    this.ordersGateway.emitOrderStatusUpdate(orderId, status, userId, riderId);

    // Emit 'orderUpdated' for specific order room (User/Rider details refresh)
    this.ordersGateway.server.to(`order_${orderId}`).emit('orderUpdated', { orderId });

    // Broadcast 'orderUpdated' to riders_room so unassigned riders see the changes in their dashboard pool
    if (!riderId && (status === 'pending' || status === 'confirmed')) {
      this.ordersGateway.server.to('riders_room').emit('orderUpdated', { orderId });
    }

    if (riderId) {
      // Emit 'orderUpdated' specifically to the rider (Dashboard refresh)
      this.ordersGateway.server.to(`rider_${riderId}`).emit('orderUpdated', { orderId });

      try {
        const rider = await this.ridersRepository.findOne({ where: { id: riderId } });
        if (rider && rider.fcmToken) {
          await this.notificationsService.sendToRider(
            rider.id,
            rider.fcmToken,
            'Order Updated!',
            `Customer modified items in order #${orderId.slice(0, 8)}. Please review.`
          );
        }
      } catch (error) {
        console.error('Failed to notify rider of order update:', error);
      }
    }
  }

  async saveChatMessage(orderId: string, senderId: string, senderType: string, message?: string, imageUrl?: string, type: string = 'text', metadata?: any, replyToId?: string): Promise<OrderChatMessage> {
    const chatMessage = this.chatMessagesRepository.create({
      orderId,
      senderId,
      senderType,
      message,
      imageUrl,
      type,
      metadata,
      replyToId
    });
    const saved = await this.chatMessagesRepository.save(chatMessage);
    const result = await this.chatMessagesRepository.findOne({
      where: { id: saved.id },
      relations: ['replyTo']
    });
    if (!result) throw new NotFoundException('Message not found after save');
    return result;
  }

  async getChatHistory(orderId: string): Promise<OrderChatMessage[]> {
    return this.chatMessagesRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
      relations: ['replyTo']
    });
  }
}

