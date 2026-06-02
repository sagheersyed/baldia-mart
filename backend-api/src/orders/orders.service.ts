import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException, Query, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
import { WalletsService } from '../wallets/wallets.service';
import { Product } from '../products/product.entity';
import { Address } from '../addresses/address.entity';
import { Vendor } from '../vendors/vendor.entity';
import { UsersService } from '../users/users.service';
import { PharmaciesService } from '../pharma/pharmacies/pharmacies.service';

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
    private walletsService: WalletsService,
    private usersService: UsersService,
    @InjectQueue('orders') private ordersQueue: Queue,
    @Inject(forwardRef(() => PharmaciesService))
    private pharmaciesService: PharmaciesService,
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

    // 1. Get cart items with batched entity fetching (avoid per-item queries)
    let cartItems: any[] = [];
    if (items && items.length > 0) {
      if (orderType === 'food') {
        const menuItemIds = Array.from(
          new Set(items.map((item: any) => item.menuItemId).filter(Boolean)),
        );
        const menuItems = menuItemIds.length
          ? await this.orderItemsRepository.manager.getRepository('MenuItem').find({
              where: { id: In(menuItemIds) },
              relations: ['restaurant'],
            } as any)
          : [];
        const menuItemMap = new Map(menuItems.map((menuItem: any) => [menuItem.id, menuItem]));

        for (const item of items) {
          if (!item.menuItemId) continue;
          const menuItem = menuItemMap.get(item.menuItemId);
          if (!menuItem) continue;
          cartItems.push({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            product: menuItem,
            restaurantId: menuItem.restaurantId,
            restaurant: menuItem.restaurant,
          });
        }
      } else {
        const productIds = Array.from(
          new Set(items.map((item: any) => item.productId).filter(Boolean)),
        );
        const products = productIds.length
          ? await this.orderItemsRepository.manager.getRepository('Product').find({
              where: { id: In(productIds) },
              relations: ['brand', 'category'],
            } as any)
          : [];
        const productMap = new Map(products.map((product: any) => [product.id, product]));

        for (const item of items) {
          if (!item.productId) continue;
          const product = productMap.get(item.productId);
          if (!product) continue;
          cartItems.push({
            productId: item.productId,
            quantity: item.quantity,
            product,
          });
        }
      }
    } else {
      cartItems = await this.cartService.getCartByUserId(userId);
      if (orderType === 'food') {
        const menuItemIds = Array.from(
          new Set(cartItems.map((item: any) => item.menuItemId).filter(Boolean)),
        );
        const menuItems = menuItemIds.length
          ? await this.orderItemsRepository.manager.getRepository('MenuItem').find({
              where: { id: In(menuItemIds) },
              relations: ['restaurant'],
            } as any)
          : [];
        const menuItemMap = new Map(menuItems.map((menuItem: any) => [menuItem.id, menuItem]));

        for (const item of cartItems) {
          if (!item.menuItemId) continue;
          const menuItem = menuItemMap.get(item.menuItemId);
          if (!menuItem) continue;
          item.product = menuItem;
          item.restaurantId = menuItem.restaurantId;
          item.restaurant = menuItem.restaurant;
        }
      } else {
        const productIds = Array.from(
          new Set(cartItems.map((item: any) => item.productId).filter(Boolean)),
        );
        const products = productIds.length
          ? await this.orderItemsRepository.manager.getRepository('Product').find({
              where: { id: In(productIds) },
              relations: ['brand', 'category'],
            } as any)
          : [];
        const productMap = new Map(products.map((product: any) => [product.id, product]));

        for (const item of cartItems) {
          if (!item.productId) continue;
          const product = productMap.get(item.productId);
          if (!product) continue;
          item.product = product;
        }
      }
    }

    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    // Start Transaction for Order Placement & Stock Control
    const resultOrder = await this.ordersRepository.manager.transaction<Order>(async (transactionalManager) => {
      // 1.5 Validate Stock, Max Quantity & Business Hours
      for (const item of cartItems) {
        const productId = item.productId || item.product?.id;
        if (!productId) continue;

        // Fetch product/menu item again to get updated info for subsequent logic
        let product;
        if (orderType === 'food') {
          product = await transactionalManager.getRepository('MenuItem').findOne({
            where: { id: productId },
            relations: ['restaurant']
          }) as any;
        } else {
          product = await transactionalManager.getRepository(Product).findOne({
            where: { id: productId },
            relations: ['brand', 'category']
          }) as any;
        }

        if (!product) {
          throw new BadRequestException(`Item with ID ${productId} not found.`);
        }

        // B. Max Quantity Check
        if (product.maxQuantityPerOrder > 0 && item.quantity > product.maxQuantityPerOrder) {
          throw new BadRequestException(
            `Quantity limit exceeded for ${product.name}. Maximum allowed per order is ${product.maxQuantityPerOrder}.`
          );
        }

        // C. Business Hours Check (Hierarchy: Product > Brand > Category)
        if (orderType === 'mart') {
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
        
        item.product = product;
      }

    // 2. Validate Address
    const address = await transactionalManager.getRepository(Address).findOne({ where: { id: addressId } }) as any;
    if (!address || address.userId !== userId) throw new BadRequestException('Invalid address or address not found');

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
          const maxDist = await this.settingsService.getNumber('multi_restaurant_max_distance_km', 0.4);
          for (let i = 0; i < distinctRestaurants.length; i++) {
            for (let j = i + 1; j < distinctRestaurants.length; j++) {
              const r1 = distinctRestaurants[i];
              const r2 = distinctRestaurants[j];
              const dist = this.deliveryZonesService.calculateDistance(Number(r1.latitude), Number(r1.longitude), Number(r2.latitude), Number(r2.longitude));
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
    const pricing = await this.calculateDeliveryFeeFromCoords(Number(address.latitude), Number(address.longitude), pickupLat, pickupLng, orderType);
    if (!pricing.isValid) {
      throw new BadRequestException(`Delivery not available: ${pricing.message}`);
    }
    const finalDeliveryFee = pricing.deliveryFee + multiStopSurcharge;

    // 3.5 Validate Vendor Hours (Fulfillment Center)
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    if (orderType === 'mart' && martId && isUuid(martId)) {
      try {
        const vendor = await transactionalManager.getRepository(Vendor).findOne({ where: { id: martId } }) as any;
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

    const order = transactionalManager.getRepository(Order).create({
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
    const savedOrder = await transactionalManager.getRepository(Order).save(order);

    // 5. Atomic Stock Decrement (for Mart products)
    for (const item of cartItems) {
      if (item.productId && orderType === 'mart') {
        const updateResult = await transactionalManager.createQueryBuilder()
          .update(Product)
          .set({ stockQuantity: () => `"stock_quantity" - ${item.quantity}` })
          .where('id = :id AND "stock_quantity" >= :qty', { id: item.productId, qty: item.quantity })
          .execute();

        if (updateResult.affected === 0) {
          throw new BadRequestException(`Product ${item.product?.name || 'Unknown'} is out of stock or insufficient quantity.`);
        }
      }
    }

    // 6. Create SubOrders and OrderItems
    if (orderType === 'food' && distinctRestaurants.length > 0) {
      for (const resto of distinctRestaurants) {
        const restoItems = cartItems.filter(i => i.restaurantId === resto.id);
        const restoSubtotal = restoItems.reduce((acc, item) => {
          const price = Number(item.product.price) - Number(item.product.discount || 0);
          return acc + (price * item.quantity);
        }, 0);

        const subOrder = transactionalManager.getRepository(SubOrder).create({
          orderId: savedOrder.id,
          restaurantId: resto.id,
          status: 'pending',
          subtotal: restoSubtotal,
          estimatedPrepTimeMinutes: Math.max(...restoItems.map(i => (i.product as any)?.prepTimeMinutes || 0), resto.prepTimeMinutes || 20)
        });
        const savedSubOrder = await transactionalManager.getRepository(SubOrder).save(subOrder);

        const orderItemsToSave = restoItems.map(item => transactionalManager.getRepository(OrderItem).create({
          orderId: savedOrder.id,
          subOrderId: savedSubOrder.id,
          menuItemId: item.menuItemId,
          productId: undefined,
          quantity: item.quantity,
          priceAtTime: Number(item.product.price) - Number(item.product.discount || 0)
        }));
        await transactionalManager.getRepository(OrderItem).save(orderItemsToSave);
      }
    } else {
      const orderItemsToSave = cartItems.map(item => transactionalManager.getRepository(OrderItem).create({
        orderId: savedOrder.id,
        productId: item.productId || (item.product?.id),
        quantity: item.quantity,
        priceAtTime: Number(item.product.price) - Number(item.product.discount || 0)
      }));
      await transactionalManager.getRepository(OrderItem).save(orderItemsToSave);
    }

    // 6. Split into Sub-Orders
    await this.syncSubOrdersInternal(transactionalManager, savedOrder.id);

    // 7. Clear Cart
    if (!items) {
      await this.cartService.clearCart(userId);
    }

    // 8. Atomic Stock Decrement (for Mart products)
    for (const item of cartItems) {
      if (item.productId) {
        const updateResult = await transactionalManager.createQueryBuilder()
          .update(Product)
          .set({ stockQuantity: () => `"stock_quantity" - ${item.quantity}` })
          .where('id = :id AND "stock_quantity" >= :qty', { id: item.productId, qty: item.quantity })
          .execute();

        if (updateResult.affected === 0) {
          throw new BadRequestException(`Insufficient stock for ${item.product?.name || 'Product'}.`);
        }
      }
    }

    // 9. Record History
    await transactionalManager.getRepository(OrderHistory).save(transactionalManager.getRepository(OrderHistory).create({ 
      orderId: savedOrder.id, 
      status: 'pending', 
      notes: 'Order placed with atomic stock decrement' 
    }));

    return savedOrder;
    });

    // 9. Dispatch via Queue (Async)
    await this.ordersQueue.add('dispatch_order', { orderId: resultOrder.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    return resultOrder;
  }

  // Called by BullMQ Worker
  async processDispatch(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.menuItem', 'items.medicine', 'address', 'user', 'subOrders', 'subOrders.restaurant', 'subOrders.vendor', 'subOrders.pharmacy']
    }) as any;

    if (!order) return;

    if (order.restaurantId) {
      order.restaurant = await this.orderItemsRepository.manager.getRepository('Restaurant').findOne({ where: { id: order.restaurantId } });
    }

    // Notify admin
    this.ordersGateway.emitNewOrderToAdmin(order);

    // Start smart dispatch
    await this.startSmartDispatch(order);
  }

  async startSmartDispatch(order: any) {
    console.log(`[Smart Dispatch] Starting targeted dispatch for Order #${order.id}`);
    
    // 1. Get best riders
    let bestRiders: any[] = [];
    try {
      bestRiders = await this.ridersService.findBestRidersForOrder(order) || [];
    } catch (err) {
      console.warn(`[Smart Dispatch] Error finding best riders for Order #${order.id}:`, err);
    }
    
    if (!bestRiders || bestRiders.length === 0) {
      console.log(`[Smart Dispatch] No suitable riders found. Falling back to general broadcast.`);
      this.ordersGateway.emitNewOrderToRiders(order);
      this.notifyOnlineRiders(order); // Notify everyone
      return;
    }

    // 2. Start the dispatch waterfall
    this.dispatchToNextRider(order, bestRiders, 0);
  }

  private async dispatchToNextRider(order: any, ridersInfo: any[], index: number) {
    // Check if order is already accepted or cancelled
    const currentOrder = await this.ordersRepository.findOne({ where: { id: order.id } });
    if (!currentOrder || currentOrder.status !== 'pending') {
      console.log(`[Smart Dispatch] Order #${order.id} is no longer pending (${currentOrder?.status}). Stopping dispatch.`);
      return;
    }

    if (index >= ridersInfo.length) {
      console.log(`[Smart Dispatch] Exhausted targeted riders for Order #${order.id}. Falling back to general broadcast.`);
      this.ordersGateway.emitNewOrderToRiders(order);
      this.notifyOnlineRiders(order);
      return;
    }

    const { rider: targetRider, isBatchable } = ridersInfo[index];
    console.log(`[Smart Dispatch] Pinging Rider #${targetRider.id} (Attempt ${index + 1}/${ridersInfo.length}) - Batched: ${isBatchable}`);
    
    // Attach batch flag to the payload for the mobile app
    const payload = { ...order, isBatchedOpportunity: isBatchable };

    // Ping specific rider via Socket and FCM
    this.ordersGateway.emitNewOrderToSpecificRider(payload, targetRider.id);
    if (targetRider.fcmToken) {
      this.notificationsService.sendToRider(
        targetRider.id,
        targetRider.fcmToken,
        isBatchable ? 'Batched Route Opportunity! 🛣️' : 'Exclusive Order! 🚀',
        isBatchable 
          ? `Earn an extra Rs. ${order.total} on your current route!`
          : `You have 30 seconds to accept this Rs. ${order.total} order near you.`
      ).catch(e => console.error('FCM Error:', e));
    }

    // Wait 30 seconds, then recursively call for next rider
    setTimeout(() => {
      this.dispatchToNextRider(order, ridersInfo, index + 1);
    }, 30000);
  }

  private async notifyOnlineRiders(order: Order) {
    try {
      const whereClause: any = { isOnline: true, isActive: true };
      if (order.orderType === 'pharma') {
        whereClause.isPharmaApproved = true;
      }
      const onlineRiders = await this.ridersRepository.find({
        where: whereClause,
        select: ['id', 'fcmToken'],
      });
      const sendJobs = onlineRiders
        .filter((rider) => !!rider.fcmToken)
        .map((rider) =>
          this.notificationsService.sendToRider(
            rider.id,
            rider.fcmToken!,
            'New Order Available! 🛍️',
            `A new order for Rs. ${order.total} has been placed nearby.`,
          ),
        );
      await Promise.allSettled(sendJobs);
    } catch (error) {
      console.error('Error notifying riders:', error);
    }
  }

  async getPendingOrders(riderId?: string): Promise<Order[]> {
    const query = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .where('order.status = :status', { status: 'pending' });

    if (riderId) {
       const riderRepo = this.ordersRepository.manager.getRepository('Rider');
       const rider = await riderRepo.findOne({ where: { id: riderId } }) as any;
       if (!rider?.isPharmaApproved) {
         query.andWhere('order.orderType != :pharmaType', { pharmaType: 'pharma' });
       }
    }

    return query.orderBy('order.createdAt', 'DESC').getMany();
  }

  async getAllOrdersForAdmin(page = 1, limit = 20, startDate?: string, endDate?: string): Promise<{ data: Order[], total: number, page: number, limit: number }> {
    const where: any = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = Between(start, end);
    }

    const [data, total] = await this.ordersRepository.findAndCount({
      where,
      relations: ['items', 'items.product', 'items.medicine', 'address', 'user', 'rider', 'subOrders', 'subOrders.restaurant', 'subOrders.vendor', 'subOrders.pharmacy', 'orderHistory'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getRiderOrderHistory(riderId: string, page = 1, limit = 20, startDate?: string, endDate?: string): Promise<{ data: Order[], total: number, page: number, limit: number }> {
    const query = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .leftJoinAndSelect('subOrders.vendor', 'subOrderVendor')
      .where('order.riderId = :riderId', { riderId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['delivered', 'cancelled'] });

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }

    const [data, total] = await query
      .orderBy('order.updatedAt', 'DESC')
      .withDeleted()
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async acceptOrder(orderId: string, riderId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['rider']
    });

    if (!order) throw new NotFoundException('Order not found');

    const riderRepo = this.ordersRepository.manager.getRepository('Rider');
    const rider = await riderRepo.findOne({ where: { id: riderId } }) as any;
    if (!rider || rider.isActive === false) {
      throw new ForbiddenException('Your account has been blocked. Please contact support.');
    }

    if (order.orderType === 'pharma' && !rider.isPharmaApproved) {
      throw new ForbiddenException('You are not authorized to accept pharma orders. Please contact admin.');
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
      .leftJoinAndSelect('items.medicine', 'medicine')

      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .leftJoinAndSelect('subOrders.vendor', 'subOrderVendor')
      .where('order.riderId = :riderId', { riderId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['confirmed', 'preparing', 'assigned_to_rider', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'] })
      .orderBy('order.updatedAt', 'DESC')
      .withDeleted()
      .getMany();
  }

  async getOrderHistory(userId: string, page = 1, limit = 20, startDate?: string, endDate?: string, orderType?: string): Promise<{ data: Order[], total: number, page: number, limit: number }> {
    const query = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .where('order.userId = :userId', { userId });

    if (orderType) {
      if (orderType === 'mart_food') {
        query.andWhere('order.orderType IN (:...types)', { types: ['mart', 'food'] });
      } else {
        query.andWhere('order.orderType = :orderType', { orderType });
      }
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }

    const [data, total] = await query
      .orderBy('order.createdAt', 'DESC')
      .withDeleted()
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async getOrderById(id: string, requesterId: string, requesterRole?: string): Promise<Order> {
    const order = await this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.medicine', 'medicine')

      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('menuItem.restaurant', 'menuItemRestaurant')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.rider', 'rider')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.subOrders', 'subOrders')
      .leftJoinAndSelect('subOrders.restaurant', 'subOrderRestaurant')
      .leftJoinAndSelect('subOrders.vendor', 'subOrderVendor')
      .leftJoinAndSelect('subOrders.pharmacy', 'subOrderPharmacy')
      .where('order.id = :id', { id })
      .withDeleted()
      .getOne();

    if (!order) throw new NotFoundException('Order not found');

    if (order.prescriptionId) {
      try {
        const rxRepo = this.ordersRepository.manager.getRepository('Prescription');
        (order as any).prescription = await rxRepo.findOne({ where: { id: order.prescriptionId } });
      } catch (err) {
        console.warn('Failed to load prescription relation for order', err);
      }
    }

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
      throw new ForbiddenException('Access denied to this order');
    }

    return order;
  }

  async updateStatus(id: string, status: string, coldChainPhotoUrl?: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const oldStatus = order.status;
    if (oldStatus === 'cancelled') {
      throw new BadRequestException('Cannot update status of a cancelled order');
    }
    order.status = status;

    if (coldChainPhotoUrl) {
      order.coldChainPhotoUrl = coldChainPhotoUrl;
      order.coldChainVerifiedAt = new Date();
    }

    const updatedOrder = await this.ordersRepository.save(order);

    // Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: id, status: status })
    );

    // If order is delivered, trigger financial settlement
    if (status === 'delivered' && oldStatus !== 'delivered') {
      const orderToSettle = await this.ordersRepository.findOne({
        where: { id },
        relations: ['items', 'items.product', 'items.menuItem', 'items.medicine', 'subOrders', 'subOrders.vendor', 'subOrders.restaurant', 'subOrders.pharmacy', 'restaurant', 'pharmacy']
      });
      if (orderToSettle) {
        // We do this in a transaction to ensure atomic wallet updates
        await this.ordersRepository.manager.transaction(async (manager) => {
          await this.walletsService.processOrderSettlement(orderToSettle, manager);
        });

        // Also update legacy totalEarnings for Rider backward compatibility
        if (order.riderId) {
          const riderRepo = this.ordersRepository.manager.getRepository('Rider');
          const rider = await riderRepo.findOne({ where: { id: order.riderId } }) as any;
          if (rider) {
            rider.totalEarnings = Number(rider.totalEarnings || 0) + Number(order.deliveryFee);
            await riderRepo.save(rider);
          }
        }
      }
    }

    // Emit real-time update — notify both user AND rider
    this.ordersGateway.emitOrderStatusUpdate(id, status, order.userId, order.riderId);

    // Send push notification to user on order status change
    try {
      const user = await this.usersService.findById(order.userId);
      if (user && user.fcmToken) {
        const orderRef = order.id.slice(0, 8).toUpperCase();
        let title = '';
        let body = '';

        if (order.orderType === 'pharma') {
          // Pharma-specific notification messages
          const pharmaMessages: Record<string, { title: string; body: string }> = {
            confirmed: { title: '✅ Prescription Confirmed', body: `Your prescription order #${orderRef} has been confirmed. A rider will be assigned shortly.` },
            preparing: { title: '💊 Medicines Being Packed', body: `Your medicines for order #${orderRef} are being packed at the pharmacy.` },
            assigned_to_rider: { title: '🏍️ Rider Assigned', body: `A rider has been assigned to pick up your medicines for order #${orderRef}.` },
            ready_for_pickup: { title: '📦 Ready for Pickup', body: `Your medicines for order #${orderRef} are packed and ready for rider pickup.` },
            picked_up: { title: '🏥 Medicines Picked Up', body: `Your medicines for order #${orderRef} have been picked up from the pharmacy.` },
            in_transit: { title: '🚀 On the Way!', body: `Your medicines for order #${orderRef} are on the way to you.` },
            out_for_delivery: { title: '📍 Almost There!', body: `Your rider is near your location with order #${orderRef}.` },
            delivered: { title: '🎉 Delivered!', body: `Your medicines for order #${orderRef} have been delivered. Stay healthy! 💚` },
            cancelled: { title: '❌ Order Cancelled', body: `Your prescription order #${orderRef} has been cancelled.` },
          };
          const msg = pharmaMessages[status] || { title: `Order Update 📦`, body: `Order #${orderRef}: ${status.replace(/_/g, ' ')}` };
          title = msg.title;
          body = msg.body;
        } else {
          const readableStatus = status.replace(/_/g, ' ');
          const capStatus = readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1);
          title = `Order Update: ${capStatus} 📦`;
          body = `Your order #${orderRef} status is now: ${readableStatus}.`;
        }

        await this.notificationsService.sendToUser(user.id, user.fcmToken, title, body);
      }
    } catch (e) {
      console.error('Failed to send order status notification:', e);
    }

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
    
    // Broadcast to other riders to remove from list
    this.ordersGateway.emitOrderAccepted(id);

    return updatedOrder;
  }

  async releaseOrder(id: string, riderId: string, reason: string): Promise<Order> {
    console.log(`[OrdersService] Attempting to release order: ${id} for rider: ${riderId}`);
    const order = await this.ordersRepository.findOne({ where: { id, riderId } });
    if (!order) {
      console.warn(`[OrdersService] Release failed: Order ${id} not found or not assigned to rider ${riderId}`);
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      throw new BadRequestException('Cannot release an order that is already completed or cancelled.');
    }

    // Return to pool
    const prevRiderId = order.riderId;
    order.status = 'pending';
    order.riderId = null as any; // Detach rider
    order.releaseCount = (order.releaseCount || 0) + 1;
    order.notes = (order.notes ? order.notes + '\n' : '') + `Rider Released (${order.releaseCount}). Reason: ${reason}`;
    
    const updatedOrder = await this.ordersRepository.save(order);
    
    if (order.releaseCount >= 3) {
      await this.notificationsService.sendAdminAlert(
        'Order Repeatedly Released',
        `Order #${id.slice(0, 8)} has been released ${order.releaseCount} times. Last reason: ${reason}`,
        'high'
      );
    }
    
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: id, status: 'pending', notes: `Released by rider (Count: ${order.releaseCount}). Reason: ${reason}` })
    );

    // Notify user that status is back to pending
    this.ordersGateway.emitOrderStatusUpdate(id, 'pending', order.userId, prevRiderId);
    
    // Broadcast as a NEW order available to all riders so it appears back in their pool
    const orderWithDetails = await this.getOrderById(id, order.userId); // Get full details for broadcast
    this.ordersGateway.emitNewOrderToRiders(orderWithDetails);

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
      relations: ['items', 'subOrders', 'subOrders.items'],
    });
    if (!order) throw new NotFoundException('Order not found or access denied');
    if (order.status !== 'cancelled' && order.status !== 'delivered') {
      throw new BadRequestException('Only completed or cancelled orders can be reordered.');
    }

    // Create a fresh new order
    const newOrder = this.ordersRepository.create({
      userId: order.userId,
      addressId: order.addressId,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      restaurantId: order.restaurantId,
      brandId: order.brandId,
      notes: order.notes,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discountAmount: 0,
      total: order.total,
      status: 'pending',
      paymentStatus: 'pending',
      riderCommission: order.riderCommission,
      deliveryDistanceKm: order.deliveryDistanceKm,
    });
    const savedOrder = await this.ordersRepository.save(newOrder);

    // Map to keep track of created items to avoid duplicates
    const itemMap = new Map<string, string>();

    // Copy items (Primary source: order.items)
    if (order.items && order.items.length > 0) {
      const newItems = order.items.map(item => {
        const newItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          menuItemId: item.menuItemId,
          medicineId: item.medicineId,
          quantity: item.quantity,
          priceAtTime: item.priceAtTime,
          productName: item.productName, // CRITICAL: Preserve name
          imageUrl: item.imageUrl,       // CRITICAL: Preserve image
          status: 'active'
        });
        return newItem;
      });
      const savedItems = await this.orderItemsRepository.save(newItems);
      
      // Build map to link sub-orders to these new items if needed
      order.items.forEach((oldItem, idx) => {
        itemMap.set(oldItem.id, savedItems[idx].id);
      });
    }

    // Copy subOrders
    if (order.subOrders && order.subOrders.length > 0) {
      for (const sub of order.subOrders) {
        const newSubOrder = this.subOrdersRepository.create({
          orderId: savedOrder.id,
          restaurantId: sub.restaurantId,
          vendorId: sub.vendorId,
          pharmacyId: (sub as any).pharmacyId,
          status: 'pending',
          subtotal: sub.subtotal
        });
        const savedSubOrder = await this.subOrdersRepository.save(newSubOrder);

        // Update items that belong to this sub-order
        if (sub.items && sub.items.length > 0) {
          for (const oldSubItem of sub.items) {
            const newItemId = itemMap.get(oldSubItem.id);
            if (newItemId) {
              await this.orderItemsRepository.update(newItemId, { subOrderId: savedSubOrder.id });
            } else {
              // Fallback: If for some reason item wasn't in order.items but is in subOrder.items
              const newItem = this.orderItemsRepository.create({
                orderId: savedOrder.id,
                subOrderId: savedSubOrder.id,
                productId: oldSubItem.productId,
                menuItemId: oldSubItem.menuItemId,
                medicineId: oldSubItem.medicineId,
                quantity: oldSubItem.quantity,
                priceAtTime: oldSubItem.priceAtTime,
                productName: oldSubItem.productName,
                imageUrl: oldSubItem.imageUrl,
                status: 'active'
              });
              await this.orderItemsRepository.save(newItem);
            }
          }
        }
      }
    }

    // Record History
    await this.orderHistoryRepository.save(
      this.orderHistoryRepository.create({ orderId: savedOrder.id, status: 'pending', notes: `Reordered from #${id.slice(0, 8)}` })
    );

    // Emit real-time update
    this.ordersGateway.emitOrderStatusUpdate(savedOrder.id, 'pending', userId);

    return this.getOrderById(savedOrder.id, userId, 'user');
  }

  async removeOrderItem(orderId: string, itemId: string, requesterId: string, requesterRole?: string, reason?: string): Promise<Order> {
    return this.ordersRepository.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.product', 'items.menuItem', 'address'],
      });

      if (!order) throw new NotFoundException('Order not found');

      const isOwner = order.userId === requesterId;
      const isAssignedRider = order.riderId === requesterId;
      const isRiderInFlow = requesterRole === 'rider' && (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing');
      const isVendorOrAdmin = requesterRole === 'vendor' || requesterRole === 'admin' || requesterRole === 'mart';

      if (!isOwner && !isAssignedRider && !isRiderInFlow && !isVendorOrAdmin) {
        throw new ForbiddenException('Access denied to modify this order');
      }

      // Only allow removal while pending, confirmed, or preparing (while at mart/restaurant)
      const allowedStatuses = ['pending', 'confirmed', 'preparing'];
      if (!allowedStatuses.includes(order.status) && !isVendorOrAdmin) {
        throw new BadRequestException(`Cannot remove items when order is ${order.status}`);
      }

      const itemToRemove = order.items.find(i => i.id === itemId);
      if (!itemToRemove) throw new NotFoundException('Item not found in this order');

      itemToRemove.status = 'missing';
      await manager.save(OrderItem, itemToRemove);

      // --- ADMIN ALERT FOR HIGH-VALUE ITEMS ---
      try {
        const threshold = await this.settingsService.getNumber('high_value_item_threshold', 1000);
        const itemValue = Number(itemToRemove.priceAtTime) * itemToRemove.quantity;
        if (itemValue >= threshold) {
          const itemName = itemToRemove.product?.name || itemToRemove.menuItem?.name || 'Unknown Item';
          await this.notificationsService.sendAdminAlert(
            'High-Value Item Missing',
            `Order #${orderId.slice(0, 8)}: "${itemName}" (Rs ${itemValue}) marked missing by ${requesterRole}. Reason: ${reason || 'N/A'}`,
            'high'
          );
        }
      } catch (e) {
        console.error('Failed to trigger admin missing item alert:', e);
      }

      // Recalculate totals based on active items only
      const allItems = await manager.find(OrderItem, { where: { orderId: order.id } });
      const remainingActiveItems = allItems.filter(i => i.status === 'active');

      let newSubtotal = 0;
      remainingActiveItems.forEach(i => {
        newSubtotal += Number(i.priceAtTime) * i.quantity;
      });

      order.subtotal = newSubtotal;
      order.total = newSubtotal + Number(order.deliveryFee) - Number(order.discountAmount || 0);

      if (remainingActiveItems.length === 0) {
        order.status = 'cancelled';
        const cancelReason = reason ? `Reason: ${reason}` : 'All items marked as missing.';
        order.notes = (order.notes ? order.notes + '\n' : '') + `Cancelled: ${cancelReason}`;
        order.total = 0; 
      } else if (reason) {
        order.notes = (order.notes ? order.notes + '\n' : '') + `Item marked missing: ${reason}`;
      }

      const updatedOrder = await manager.save(Order, order);

      // Sync sub-orders to ensure restaurant-wise totals and counts are correct
      await this.syncSubOrdersInternal(manager, orderId);

      // Notify tracking screen and rider
      await this.emitUpdateNotifications(orderId, updatedOrder.status, order.userId, updatedOrder.riderId);

      // If the order became cancelled, notify ALL riders to remove it from their pool/list
      if (updatedOrder.status === 'cancelled') {
        this.ordersGateway.emitOrderAccepted(orderId); // Trigger dashboard removal
        this.ordersGateway.server.to('riders_room').emit('orderCancelled', { orderId });
      }

      return updatedOrder;
    });
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

      // Fetch product/medicine to get current price and check stock & business hours
      let product: any;
      if (order.orderType === 'pharma') {
        product = await manager.getRepository('Medicine').findOne({ where: { id: productId } });
      } else {
        product = await manager.getRepository('Product').findOne({ 
          where: { id: productId },
          relations: ['brand', 'category']
        });
      }

      if (!product) throw new NotFoundException(`${order.orderType === 'pharma' ? 'Medicine' : 'Product'} not found`);

      // Hierarchical Business Hour Check (for Mart items)
      if (order.orderType === 'mart') {
        const brand = (product as any).brand;
        const category = (product as any).category;

        if (category && !this.isBusinessOpen(category.openingTime, category.closingTime)) {
          throw new BadRequestException(`Category '${category.name}' is currently closed.`);
        }
        if (brand && !this.isBusinessOpen(brand.openingTime, brand.closingTime)) {
          throw new BadRequestException(`Brand '${brand.name}' is currently closed.`);
        }
      }

      if (!this.isBusinessOpen(product.openingTime, product.closingTime)) {
        throw new BadRequestException(`${order.orderType === 'pharma' ? 'Medicine' : 'Product'} '${product.name}' is currently unavailable.`);
      }

      // Quantity Limit Check
      const existingItem = order.items.find(i => i.productId === productId || i.medicineId === productId);
      const currentQty = existingItem ? existingItem.quantity : 0;
      const totalNewQty = currentQty + quantity;

      const maxQty = Number(product.maxQuantityPerOrder || 0);
      if (maxQty > 0 && totalNewQty > maxQty) {
        throw new BadRequestException(
          `Quantity limit exceeded for ${product.name}. Maximum allowed per order is ${maxQty}.`
        );
      }

      const stockQty = Number(product.stockQuantity ?? 999); // Medicines might not have strict stock in catalog (checked at fulfillment)
      if (stockQty < quantity && order.orderType !== 'pharma') {
        throw new BadRequestException(`Only ${stockQty} units available in stock.`);
      }

      const price = Number(product.price || product.mrp || 0);
      const discount = Number(product.discount || 0);
      const unitPrice = price - discount;

      // Check if product already exists in this order
      let item = order.items.find(i => (i.productId === productId || i.medicineId === productId));

      if (item) {
        item.quantity += quantity;
        await manager.save(OrderItem, item);
      } else {
        // Explicitly create with IDs to avoid relation sync issues
        const itemData: any = {
          orderId: orderId,
          quantity,
          priceAtTime: unitPrice,
          productName: product.name,
          imageUrl: product.imageUrl,
          status: 'active'
        };

        if (order.orderType === 'pharma') {
          itemData.medicineId = productId;
        } else {
          itemData.productId = productId;
        }

        item = manager.create(OrderItem, itemData);
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

  async calculateDeliveryFee(addressId: string, restaurantId?: string, orderType: string = 'mart', items?: any[]) {
    const address = await this.addressesService.findOne(addressId) as any;
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
    } else if (orderType === 'pharma') {
      try {
        // Stock-Aware Zone Validation (Architectural Improvement)
        const zoneRes = await this.deliveryZonesService.validateAddressInZone(
          Number(address.latitude), 
          Number(address.longitude)
        );
        
        if (!zoneRes.isValid || !zoneRes.zone) {
          return {
            isValid: false,
            deliveryFee: 0,
            message: 'Baldia Pharma services are not currently available in your delivery area.',
          };
        }

        // If items are provided, check stock in the zone
        if (items && items.length > 0) {
          for (const item of items) {
            const bestPharma = await this.pharmaciesService.findBestPharmacy(
              item.medicineId || item.id, 
              item.quantity || 1,
              zoneRes.zone.id
            );
            if (!bestPharma) {
              const medicineRepo = this.ordersRepository.manager.getRepository('Medicine');
              const med = await medicineRepo.findOne({ where: { id: item.medicineId || item.id } });
              return {
                isValid: false,
                deliveryFee: 0,
                message: `No pharmacy nearby has stock for ${med?.name || 'one of your items'}.`,
              };
            }
          }
        }

        const nearby = await this.pharmaciesService.findNearby(Number(address.latitude), Number(address.longitude), 15);
        if (nearby && nearby.length > 0) {
          pickupLat = Number(nearby[0].latitude);
          pickupLng = Number(nearby[0].longitude);
        }
      } catch (err) {
        console.error('Error finding nearby pharmacy for fee calculation:', err);
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

    return this.calculateDeliveryFeeFromCoords(Number(address.latitude), Number(address.longitude), pickupLat, pickupLng, orderType);
  }

  async calculateDeliveryFeeFromCoords(custLat: number, custLng: number, pickupLat: number, pickupLng: number, orderType: string = 'mart') {

    const validation = await this.deliveryZonesService.validateAddressInZone(custLat, custLng);

    const maxRadiusKey = orderType === 'pharma' ? 'pharma_delivery_max_radius_km' : 'delivery_max_radius_km';
    const maxRad = await this.settingsService.getNumber(maxRadiusKey, orderType === 'pharma' ? 15 : 10);

    // Calculate actual distance from pickup point
    const realDistance = this.deliveryZonesService.calculateDistance(custLat, custLng, pickupLat, pickupLng);

    // Strict Enforcement: If NOT in a zone OR distance exceeds max radius
    if (!validation.isValid || realDistance > maxRad) {
      const reason = !validation.isValid 
        ? 'Location not in any active delivery zone.' 
        : `Distance (${realDistance.toFixed(1)}km) exceeds maximum service radius of ${maxRad}km.`;
      
      return {
        isValid: false,
        deliveryFee: 0,
        distance: realDistance,
        message: `Delivery not available: ${reason}`,
      };
    }

    const baseFeeKey = orderType === 'pharma' ? 'pharma_delivery_base_fee' : 'delivery_base_fee';
    const thresholdKey = orderType === 'pharma' ? 'pharma_delivery_threshold_km' : 'delivery_threshold_km';
    const perKmFeeKey = orderType === 'pharma' ? 'pharma_delivery_per_km_fee' : 'delivery_per_km_fee';

    const baseFee = await this.settingsService.getNumber(baseFeeKey, orderType === 'pharma' ? 150 : 150);
    const threshold = await this.settingsService.getNumber(thresholdKey, 3);
    const perKmFee = await this.settingsService.getNumber(perKmFeeKey, orderType === 'pharma' ? 20 : 20);

    let deliveryFee = baseFee;

    if (realDistance > threshold) {
      const extraKm = Math.ceil(realDistance - threshold);
      deliveryFee += extraKm * perKmFee;
    }

    return {
      isValid: true,
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      distance: realDistance,
      message: 'Service is available.',
    };
  }

  private async syncSubOrdersInternal(manager: any, orderId: string) {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.menuItem', 'items.medicine', 'items.menuItem.restaurant', 'address'],
    });
    if (!order) return;

    const allItems = order.items;

    // Get existing sub-orders
    const existingSubOrders = await manager.find(SubOrder, { where: { orderId } });
    const existingMap = new Map();
    existingSubOrders.forEach(s => {
      const key = order.orderType === 'food' ? s.restaurantId : (order.orderType === 'pharma' ? s.pharmacyId : s.vendorId);
      existingMap.set(key, s);
    });

    const neededKeys = new Set(); 
    const subOrderDataMap = new Map(); 

    // Batch lookup for Mart orders to avoid N+1 queries
    let martVendorMap = new Map();
    if (order.orderType !== 'food') {
      const productIds = allItems.map(i => i.productId).filter(Boolean);
      martVendorMap = await this.vendorsService.findBestVendorsForProducts(
        productIds,
        Number(order.address?.latitude || 0),
        Number(order.address?.longitude || 0)
      );
    }

    for (const item of allItems) {
      if (item.status !== 'active') continue; // Only process active items for sub-order generation

      let key: string | null = null;
      let vLat = 0;
      let vLng = 0;

      if (order.orderType === 'food') {
        if (item.menuItem?.restaurantId) {
          key = item.menuItem.restaurantId;
          vLat = Number(item.menuItem.restaurant?.latitude || 0);
          vLng = Number(item.menuItem.restaurant?.longitude || 0);
        }
      } else if (order.orderType === 'mart') {
        const vp = martVendorMap.get(item.productId);
        if (vp) {
          key = vp.vendorId;
          vLat = Number(vp.vendor?.lat || 0);
          vLng = Number(vp.vendor?.lng || 0);
        }
      } else if (order.orderType === 'pharma') {
        key = order.pharmacyId;
        if (order.pharmacy) {
          vLat = Number(order.pharmacy.latitude || 0);
          vLng = Number(order.pharmacy.longitude || 0);
        }
      }

      if (key) {
        neededKeys.add(key);
        if (!subOrderDataMap.has(key)) {
          subOrderDataMap.set(key, { items: [], id: key, lat: vLat, lng: vLng });
        }
        subOrderDataMap.get(key).items.push(item);
      }
    }

    // Optimize sequences for Mart orders
    let sequenceMap = new Map();
    if (order.orderType !== 'food' && subOrderDataMap.size > 0) {
      const coords = Array.from(subOrderDataMap.values()).map(v => ({
        vendorId: v.id, lat: v.lat, lng: v.lng,
      }));
      const sequence = this.vendorsService.optimizePickupSequence(coords, Number(order.address?.latitude || 0), Number(order.address?.longitude || 0));
      sequenceMap = new Map(sequence.map(s => [s.vendorId, s.sequence]));
    }

    // 1. Delete sub-orders that are no longer needed (have ZERO items associated)
    for (const sub of existingSubOrders) {
      const key = order.orderType === 'food' ? sub.restaurantId : (order.orderType === 'pharma' ? sub.pharmacyId : sub.vendorId);
      if (!neededKeys.has(key)) {
        await manager.delete(SubOrder, sub.id);
      }
    }

    // 2. Create or Update sub-orders
    for (const [key, data] of subOrderDataMap) {
      const activeItemsInSub = data.items.filter(i => i.status === 'active');
      const subtotal = activeItemsInSub.reduce((acc, i) => acc + (Number(i.priceAtTime) * i.quantity), 0);
      const sequence = order.orderType === 'food' ? 1 : (sequenceMap.get(key) ?? 1);
      
      let subOrder = existingMap.get(key);
      
      if (subOrder) {
        await manager.update(SubOrder, subOrder.id, {
          subtotal,
          pickupSequence: sequence
        });
      } else {
        subOrder = manager.create(SubOrder, {
          orderId,
          restaurantId: order.orderType === 'food' ? key : undefined,
          vendorId: order.orderType === 'mart' ? key : undefined,
          pharmacyId: order.orderType === 'pharma' ? key : undefined,
          status: 'pending',
          subtotal,
          pickupSequence: sequence
        });
        subOrder = await manager.save(SubOrder, subOrder);
      }

      // Update item relationships for ALL items in this group in a single batch
      const itemsToUpdate = data.items.filter(item => item.subOrderId !== subOrder.id);
      if (itemsToUpdate.length > 0) {
        await manager.update(OrderItem, { id: In(itemsToUpdate.map(i => i.id)) }, { subOrderId: subOrder.id });
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
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (order && (order.status === 'delivered' || order.status === 'cancelled')) {
      throw new BadRequestException('Cannot send messages to a completed order');
    }

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

    // Send push notification to the recipient
    if (order) {
      try {
        const msgTitle = `New message in Order #${order.id.slice(0, 8)}`;
        const msgBody = type === 'image' ? '📷 Image' : (message || 'New message');

        if (senderType === 'user' && order.riderId) {
          const rider = await this.ridersRepository.findOne({ where: { id: order.riderId } });
          if (rider && rider.fcmToken) {
            await this.notificationsService.sendToRider(rider.id, rider.fcmToken, msgTitle, msgBody, imageUrl);
          }
        } else if ((senderType === 'rider' || senderType === 'admin') && order.userId) {
          const user = await this.usersService.findById(order.userId);
          if (user && user.fcmToken) {
            await this.notificationsService.sendToUser(user.id, user.fcmToken, msgTitle, msgBody, imageUrl);
          }
        }
      } catch (err) {
        console.error('Failed to send chat notification:', err);
      }
    }

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

