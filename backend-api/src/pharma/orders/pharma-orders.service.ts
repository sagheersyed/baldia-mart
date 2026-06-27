import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../../orders/order.entity';
import { OrderItem } from '../../orders/order-item.entity';
import { Medicine } from '../medicines/medicine.entity';
import { Prescription } from '../prescriptions/prescription.entity';
import { Address } from '../../addresses/address.entity';
import { Pharmacy } from '../pharmacies/pharmacy.entity';
import { User } from '../../users/user.entity';
import { SubOrder } from '../../orders/sub-order.entity';
import { FinanceService } from '../../finance/finance.service';
import { Wallet } from '../../wallets/wallet.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { SettingsService } from '../../settings/settings.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { OrdersService } from '../../orders/orders.service';
import { OrdersGateway } from '../../orders/orders.gateway';
import { DeliveryZonesService } from '../../delivery-zones/delivery-zones.service';

@Injectable()
export class PharmaOrdersService {
  private readonly logger = new Logger(PharmaOrdersService.name);

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
    @InjectRepository(SubOrder)
    private readonly subOrderRepo: Repository<SubOrder>,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly pharmaciesService: PharmaciesService,
    private readonly deliveryZonesService: DeliveryZonesService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
    @Inject(forwardRef(() => FinanceService))
    private readonly financeService: FinanceService,
  ) {}

  async placeOrder(userId: string, dto: {
    addressId: string;
    items: { 
      medicineId: string; 
      quantity: number; 
      name?: string; 
      mrp?: number; 
      brand?: string; 
      strength?: string; 
      isManual?: boolean; 
    }[];
    prescriptionId?: string;
    paymentMethod: string;
    notes?: string;
    walletAmount?: number;
  }) {
    if (!dto.items?.length) throw new BadRequestException('Cart is empty');

    // 1. Validate Address
    const address = await this.addressRepo.findOne({ where: { id: dto.addressId, userId } });
    if (!address) throw new BadRequestException('Invalid delivery address');

    // 2. Fetch Medicines (filter out manual items starting with 'manual-')
    const standardItems = dto.items.filter(i => i.medicineId && !i.medicineId.startsWith('manual-'));
    const manualItems = dto.items.filter(i => !i.medicineId || i.medicineId.startsWith('manual-'));

    const standardMedicineIds = standardItems.map(i => i.medicineId);
    const medicines = standardMedicineIds.length > 0
      ? await this.medicineRepo.find({ where: { id: In(standardMedicineIds) } })
      : [];

    if (medicines.length !== standardMedicineIds.length) {
      throw new BadRequestException('Some medicines not found');
    }

    // 2.2 Quantity Limit Validation (Senior Pharmacist Requirement)
    for (const item of dto.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (med && item.quantity > med.maxQuantityPerOrder) {
        throw new BadRequestException(`Maximum allowed quantity for ${med.name} is ${med.maxQuantityPerOrder}.`);
      }
    }

    // 2.5 Zone Validation (Architectural Fix)
    const zoneRes = await this.deliveryZonesService.validateAddressInZone(
      Number(address.latitude), 
      Number(address.longitude)
    );
    if (!zoneRes.isValid || !zoneRes.zone) {
      throw new BadRequestException('Baldia Pharma services are not currently available in your delivery area.');
    }
    const zoneId = zoneRes.zone.id;

    // 3. Rx Validation
    const rxRequired = medicines.some(m => m.requiresPrescription);
    if (rxRequired || dto.prescriptionId) {
      // Expert Mode: Allow bypassing manual verification if configured
      const skipVerification = await this.settingsService.getBoolean('pharma_skip_prescription_verification', false);
      
      if (!skipVerification) {
        if (!dto.prescriptionId) throw new BadRequestException('Prescription required for this order');
        
        const prescription = await this.prescriptionRepo.findOne({ 
          where: { id: dto.prescriptionId, userId, status: In(['approved', 'partially_approved']) } 
        });
        if (!prescription) throw new BadRequestException('Valid approved prescription not found');
      }
    }

    // 3.5 Find Best Pharmacies for Fulfillment (Phase 16: Multi-Pharma Splitting)
    const pharmaMap = new Map<string, { pharmacy: Pharmacy, items: typeof dto.items }>();

    for (const item of standardItems) {
      const med = medicines.find(m => m.id === item.medicineId);
      const bestPharma = await this.pharmaciesService.findBestPharmacy(
        item.medicineId, 
        item.quantity,
        zoneId,
        med?.isColdChain || false, // Senior Pharmacist's safety requirement
        address.latitude ? Number(address.latitude) : undefined,
        address.longitude ? Number(address.longitude) : undefined
      );

      if (!bestPharma) {
        throw new BadRequestException(`No pharmacy nearby has stock for ${med?.name || item.medicineId}.`);
      }

      if (!pharmaMap.has(bestPharma.id)) {
        pharmaMap.set(bestPharma.id, { pharmacy: bestPharma, items: [] });
      }
      pharmaMap.get(bestPharma.id)!.items.push(item);
    }

    // If there are only manual items, we need a fallback pharmacy in that zone
    if (pharmaMap.size === 0 && manualItems.length > 0) {
      const defaultPharma = await this.pharmacyRepo.findOne({
        where: { zoneId, isActive: true, isVerified: true, isOpen: true }
      });
      if (!defaultPharma) {
        throw new BadRequestException('No pharmacy available in your delivery area to fulfill this prescription.');
      }
      pharmaMap.set(defaultPharma.id, { pharmacy: defaultPharma, items: [] });
    }

    // Assign all manual items to the first available pharmacy in the map
    if (manualItems.length > 0) {
      const firstPharmaId = Array.from(pharmaMap.keys())[0];
      if (firstPharmaId) {
        pharmaMap.get(firstPharmaId)!.items.push(...manualItems);
      }
    }

    const selectedPharmacies = Array.from(pharmaMap.values());
    const primaryPharma = selectedPharmacies[0].pharmacy;

    // 4. Calculate Totals & Fees
    let subtotal = 0;

    for (const item of dto.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      const price = med 
        ? (Number(med.mrp) - Number(med.discount || 0))
        : Number(item.mrp || 0);
      subtotal += price * item.quantity;
    }

    // Dynamic Delivery Fee based on multi-stop distance (Phase 16)
    // Only calculate/apply the delivery fee of the furthest pharmacy rather than summing them all up
    let maxDeliveryFee = 0;
    let furthestDistance = 0;
    for (const sp of selectedPharmacies) {
      const feeRes = await this.ordersService.calculateDeliveryFeeFromCoords(
        Number(address.latitude), Number(address.longitude),
        Number(sp.pharmacy.latitude), Number(sp.pharmacy.longitude),
        'pharma'
      );
      if (feeRes.deliveryFee > maxDeliveryFee) {
        maxDeliveryFee = feeRes.deliveryFee;
      }
      const dist = feeRes.distance || 0;
      if (dist > furthestDistance) {
        furthestDistance = dist;
      }
    }
    const totalDeliveryFee = maxDeliveryFee;
    const totalDistance = furthestDistance;

    // --- WALLET BALANCE APPLICATION ---
    let walletDebit = 0;
    const walletAmount = dto.walletAmount;
    if (walletAmount && walletAmount > 0) {
       const userWallet = await this.orderRepo.manager.findOne(Wallet, {
         where: { userId, userType: 'User' }
       });
       
       if (!userWallet || Number(userWallet.balance) < walletAmount) {
         throw new BadRequestException('Insufficient wallet balance to cover the requested amount.');
       }
       
       walletDebit = walletAmount;
    }

    const total = Math.max(0, subtotal + totalDeliveryFee - walletDebit);

    // Detect Priority and Cold Chain
    const isEmergency = medicines.some(m => m.isEmergency);
    const isColdChain = medicines.some(m => m.isColdChain);

    // 5. Create Main Order (Wrap in transaction)
    return await this.orderRepo.manager.transaction(async (manager) => {
    const order = manager.create(Order, {
      userId,
      addressId: dto.addressId,
      orderType: 'pharma',
      status: 'pending',
      priority: isEmergency ? 'high' : 'standard',
      isColdChain,
      paymentMethod: dto.paymentMethod,
      paymentStatus: 'pending',
      subtotal,
      deliveryFee: totalDeliveryFee,
      deliveryDistanceKm: totalDistance,
      walletAdjustment: walletDebit,
      total,
      notes: dto.notes,
      prescriptionId: dto.prescriptionId,
      pharmacyId: primaryPharma.id,
    });

    const savedOrder = await manager.save(order);

    // --- TRIGGER WALLET DEBIT LEDGER ENTRY ---
    if (walletDebit > 0) {
      const uWallet = await manager.findOne(Wallet, { where: { userId, userType: 'User' } });
      await this.financeService.executeLedgerTransaction(
        manager,
        'ORDER_PAYMENT',
        savedOrder.id,
        `Wallet balance applied to Pharma order #${savedOrder.id.split('-')[0].toUpperCase()}`,
        [{
          walletId: uWallet?.id,
          accountTag: 'EARNINGS',
          direction: 'DEBIT',
          amount: walletDebit,
          moduleType: 'pharma',
          description: `Paid for order #${savedOrder.id.split('-')[0].toUpperCase()} via wallet`
        }]
      );
    }
    
    // 5.5 Create Sub-Orders for each pharmacy and Reserve Inventory
    const subOrders: any[] = [];
    let sequence = 1;

    for (const [pId, pData] of pharmaMap) {
      // Calculate sub-total for this pharmacy's items
      const pSubtotal = pData.items.reduce((sum, item) => {
        const med = medicines.find(m => m.id === item.medicineId);
        const price = med 
          ? (Number(med.mrp) - Number(med.discount || 0)) 
          : Number(item.mrp || 0);
        return sum + price * item.quantity;
      }, 0);

      const subOrder = manager.create(SubOrder, {
        orderId: savedOrder.id,
        pharmacyId: pId,
        status: 'pending',
        subtotal: pSubtotal,
        pickupSequence: sequence++,
      });
      const savedSub = await manager.save(subOrder);
      subOrders.push(savedSub);

      // Link items and Reserve Stock
      for (const item of pData.items) {
        const med = medicines.find(m => m.id === item.medicineId);
        
        let price = 0;
        let name = '';
        let imageUrl: string | undefined = undefined;
        let isManual = false;

        if (med) {
          // Reserve Stock (Only for standard medicines)
          const reserved = await this.pharmaciesService.reserveStock(pId, item.medicineId, item.quantity);
          if (!reserved) {
            // Note: In production, we'd implement a full transactional rollback here
            throw new BadRequestException(`Failed to reserve stock for ${med.name} at pharmacy ${pId}.`);
          }
          price = Number(med.mrp) - Number(med.discount || 0);
          name = med.name;
          imageUrl = med.imageUrl || undefined;
        } else {
          price = Number(item.mrp || 0);
          name = item.name || 'Custom Medicine';
          isManual = true;
        }

        // Create Order Item linked to this sub-order
        const orderItem = manager.create(OrderItem, {
          orderId: savedOrder.id,
          subOrderId: savedSub.id,
          medicineId: isManual ? undefined : item.medicineId, 
          productName: name,
          priceAtTime: price,
          quantity: item.quantity,
          imageUrl: imageUrl,
          status: 'active'
        });
        await manager.save(orderItem);
      }
    }

    // 6. Notify
    const user = await manager.findOne(User, { where: { id: userId }, select: ['fcmToken'] });
    if (user?.fcmToken) {
      await this.notificationsService.sendToUser(
        userId, 
        user.fcmToken,
        'Order Placed ✓',
        `Your pharmaceutical order #${savedOrder.id.slice(0, 8)} has been received and split into ${selectedPharmacies.length} package(s).`
      );
    }

    // Broadcast to Admin and start Smart Dispatch for riders
    this.ordersGateway.emitNewOrderToAdmin(savedOrder);
    try {
      await this.ordersService.startSmartDispatch(savedOrder);
    } catch (err: any) {
      this.logger.error(`Failed to start smart dispatch for pharma order #${savedOrder.id}: ${err.message}`, err.stack);
      this.ordersGateway.emitNewOrderToRiders(savedOrder);
    }

    return savedOrder;
    });
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
