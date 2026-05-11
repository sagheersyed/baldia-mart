import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../../orders/order.entity';
import { OrderItem } from '../../orders/order-item.entity';
import { Medicine } from '../medicines/medicine.entity';
import { Prescription } from '../prescriptions/prescription.entity';
import { Address } from '../../addresses/address.entity';
import { Pharmacy } from '../pharmacies/pharmacy.entity';
import { User } from '../../users/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { SettingsService } from '../../settings/settings.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class PharmaOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly pharmaciesService: PharmaciesService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async placeOrder(userId: string, dto: {
    addressId: string;
    items: { medicineId: string; quantity: number }[];
    prescriptionId?: string;
    paymentMethod: string;
    notes?: string;
  }) {
    if (!dto.items?.length) throw new BadRequestException('Cart is empty');

    // 1. Validate Address
    const address = await this.addressRepo.findOne({ where: { id: dto.addressId, userId } });
    if (!address) throw new BadRequestException('Invalid delivery address');

    // 2. Fetch Medicines
    const medicineIds = dto.items.map(i => i.medicineId);
    const medicines = await this.medicineRepo.find({ where: { id: In(medicineIds) } });
    if (medicines.length !== medicineIds.length) throw new BadRequestException('Some medicines not found');

    // 3. Rx Validation
    const rxRequired = medicines.some(m => m.requiresPrescription);
    if (rxRequired) {
      if (!dto.prescriptionId) throw new BadRequestException('Prescription required for this order');
      
      const prescription = await this.prescriptionRepo.findOne({ 
        where: { id: dto.prescriptionId, userId, status: 'approved' } 
      });
      if (!prescription) throw new BadRequestException('Valid approved prescription not found');
    }

    // 3.5 Find Best Pharmacy for Fulfillment
    // For now, we find one pharmacy that can handle the entire order (MVP restriction)
    // In future, we can split orders into multiple sub-orders
    const firstMedId = medicineIds[0];
    const bestPharma = await this.pharmaciesService.findBestPharmacy(
      firstMedId, 
      dto.items[0].quantity,
      address.latitude ? Number(address.latitude) : undefined,
      address.longitude ? Number(address.longitude) : undefined
    );

    if (!bestPharma) {
      throw new BadRequestException('No pharmacy nearby has the required stock for these medicines.');
    }

    // Verify all other items are in stock at the SAME pharmacy
    for (const item of dto.items) {
      const hasStock = await this.pharmaciesService.checkStock(bestPharma.id, item.medicineId, item.quantity);
      if (!hasStock) {
        throw new BadRequestException(`Pharmacy "${bestPharma.name}" does not have enough stock for all items.`);
      }
    }

    // 4. Calculate Totals & Fees
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of dto.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (!med) continue;

      const mrp = Number(med.mrp);
      const discount = Number(med.discount || 0);
      const price = mrp - discount;
      
      subtotal += price * item.quantity;
      
      const orderItem = this.orderItemRepo.create({
        medicineId: med.id, 
        productName: med.name,
        priceAtTime: price,
        quantity: item.quantity,
        imageUrl: med.imageUrl,
        status: 'active'
      });
      orderItems.push(orderItem);
    }

    // Dynamic Delivery Fee based on distance to the selected pharmacy
    const feeRes = await this.ordersService.calculateDeliveryFeeFromCoords(
      Number(address.latitude), Number(address.longitude),
      Number(bestPharma.latitude), Number(bestPharma.longitude),
      'pharma'
    );

    const deliveryFee = feeRes.deliveryFee;

    const total = subtotal + deliveryFee;

    // 5. Create Order
    const order = this.orderRepo.create({
      userId,
      addressId: dto.addressId,
      orderType: 'pharma',
      status: 'pending',
      paymentMethod: dto.paymentMethod,
      paymentStatus: 'pending',
      subtotal,
      deliveryFee,
      total,
      notes: dto.notes,
      prescriptionId: dto.prescriptionId,
      pharmacyId: bestPharma.id,
    });

    const savedOrder = await this.orderRepo.save(order);
    
    // 5.5 Reserve Inventory
    for (const item of dto.items) {
      const reserved = await this.pharmaciesService.reserveStock(bestPharma.id, item.medicineId, item.quantity);
      if (!reserved) {
        // Rollback (simple deletion for now, in prod use transactions)
        await this.orderRepo.delete(savedOrder.id);
        throw new BadRequestException(`Failed to reserve stock for ${item.medicineId}. It may have gone out of stock.`);
      }
    }

    // Save items
    for (const item of orderItems) {
      item.orderId = savedOrder.id;
    }
    await this.orderItemRepo.save(orderItems);

    // 6. Notify
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['fcmToken'] });
    if (user?.fcmToken) {
      await this.notificationsService.sendToUser(
        userId, 
        user.fcmToken,
        'Order Placed ✓',
        `Your pharmaceutical order #${savedOrder.id.slice(0, 8)} has been received.`
      );
    }

    return savedOrder;
  }

  async getMyOrders(userId: string) {
    return this.orderRepo.find({
      where: { userId, orderType: 'pharma' },
      order: { createdAt: 'DESC' },
      relations: ['items', 'items.medicine']
    });
  }

  async getOrderDetails(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.medicine', 'address', 'pharmacy']
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
