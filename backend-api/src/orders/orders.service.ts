import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CartService } from '../cart/cart.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { AddressesService } from '../addresses/addresses.service';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemsRepository: Repository<OrderItem>,
    private cartService: CartService,
    private deliveryZonesService: DeliveryZonesService,
    private addressesService: AddressesService,
    private ordersGateway: OrdersGateway,
  ) {}

  async placeOrder(userId: string, addressId: string, paymentMethod: string, notes?: string): Promise<Order> {
    // 1. Get cart items
    const cartItems = await this.cartService.getCartByUserId(userId);
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    // 2. Validate Address & Delivery Zone
    const address = await this.addressesService.findOne(addressId);
    if (address.userId !== userId) throw new BadRequestException('Invalid address');

    const validation = await this.deliveryZonesService.validateAddressInZone(address.latitude, address.longitude);
    if (!validation.isValid) {
      throw new BadRequestException('Service not available in your area. Minimum distance is > 50km.');
    }

    // 3. Calculate Totals
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += Number(item.product.discountPrice || item.product.price) * item.quantity;
    }
    
    // Abstract delivery fee logic based on distance
    const deliveryFee = validation.distance < 5 ? 2.00 : 5.00; 
    const total = subtotal + deliveryFee;

    // 4. Create Order
    const order = this.ordersRepository.create({
      userId,
      addressId,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      deliveryDistanceKm: validation.distance,
      notes,
    });
    const savedOrder = await this.ordersRepository.save(order);

    // 5. Create Order Items
    const orderItemsToSave = cartItems.map(item => this.orderItemsRepository.create({
      orderId: savedOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtTime: Number(item.product.discountPrice || item.product.price),
    }));
    await this.orderItemsRepository.save(orderItemsToSave);

    // 6. Clear Cart
    await this.cartService.clearCart(userId);

    return savedOrder;
  }

  async getOrderHistory(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      relations: ['items', 'items.product', 'address'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    order.status = status;
    const updatedOrder = await this.ordersRepository.save(order);
    
    // Emit real-time update
    this.ordersGateway.emitOrderStatusUpdate(id, status);
    
    return updatedOrder;
  }
}
