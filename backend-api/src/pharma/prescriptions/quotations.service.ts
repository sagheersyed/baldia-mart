import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PrescriptionQuotation } from './prescription-quotation.entity';
import { Prescription } from './prescription.entity';
import { Medicine } from '../medicines/medicine.entity';
import { PharmaOrdersService } from '../orders/pharma-orders.service';
import { User } from '../../users/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(PrescriptionQuotation)
    private readonly quotationRepo: Repository<PrescriptionQuotation>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => PharmaOrdersService))
    private readonly pharmaOrdersService: PharmaOrdersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Admin/Pharmacist: Generate a quotation for an approved prescription.
   */
  async generateQuotation(
    prescriptionId: string, 
    items: { 
      id?: string;
      medicineId?: string; 
      quantity: number; 
      isSubstituted?: boolean; 
      originalMedicineId?: string;
      isManual?: boolean;
      name?: string;
      mrp?: number;
      brand?: string;
      strength?: string;
    }[], 
    deliveryCharges = 49.00
  ): Promise<PrescriptionQuotation> {
    const prescription = await this.prescriptionRepo.findOne({ where: { id: prescriptionId } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status !== 'approved' && prescription.status !== 'partially_approved') {
      throw new BadRequestException('Prescription must be approved or partially approved to generate quotation.');
    }

    const medicineIds = items
      .filter(item => !item.isManual && (item.medicineId || item.id))
      .map(item => item.medicineId || item.id);

    const medicines = medicineIds.length > 0
      ? await this.medicineRepo.find({ 
          where: { id: In(medicineIds) },
          relations: ['brand']
        })
      : [];

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const quotationItems = items.map(item => {
      const medId = item.medicineId || item.id;
      const isManual = item.isManual || !medId;

      let med: Medicine | null = null;
      if (!isManual && medId) {
        med = medicines.find(m => m.id === medId) || null;
      }

      let name = item.name || '';
      let brand = item.brand || 'Generic';
      let strength = item.strength || 'N/A';
      let mrp = item.mrp ? Number(item.mrp) : 0;
      let discount = 0;
      let taxAmount = 0;

      if (med) {
        name = med.name;
        brand = med.brand?.name || 'Generic';
        strength = med.strength || 'N/A';
        mrp = Number(med.mrp);
        discount = Number(med.discount || 0);
      } else {
        if (!isManual && medId) {
          throw new BadRequestException(`Medicine not found: ${medId}`);
        }
      }

      subtotal += mrp * item.quantity;
      discountTotal += discount * item.quantity;
      taxTotal += taxAmount * item.quantity;

      return {
        medicineId: med ? med.id : (isManual ? `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : medId),
        name,
        brand,
        strength,
        quantity: item.quantity,
        mrp,
        discount,
        taxAmount,
        isSubstituted: item.isSubstituted || false,
        originalMedicineId: item.originalMedicineId,
        isManual: !!isManual,
      };
    });

    const finalAmount = subtotal - discountTotal + taxTotal + deliveryCharges;

    // Check if there's any controlled/narcotic drug in the medicines list
    const hasControlled = medicines.some(m => m.requiresPrescription || (m as any).isControlled);

    // Controlled substances expire in 1 hour; standard expires in 24 hours
    const expiryHours = hasControlled ? 1 : 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const quotation = this.quotationRepo.create({
      prescriptionId,
      items: quotationItems,
      subtotal,
      deliveryCharges,
      taxTotal,
      discountTotal,
      finalAmount,
      expiresAt,
      status: 'pending',
    });

    const saved = await this.quotationRepo.save(quotation);

    // Send push notification to user
    try {
      const user = await this.userRepo.findOne({ where: { id: prescription.userId }, select: ['id', 'fcmToken'] });
      if (user?.fcmToken) {
        await this.notificationsService.sendToUser(
          user.id,
          user.fcmToken,
          'Prescription Quotation Ready 📄',
          `Your medical quote is ready for Rs. ${finalAmount.toFixed(0)}. Accept to place your order now!`,
        );
      }
    } catch (e) {
      console.error('Failed to send quotation ready notification:', e);
    }

    return saved;
  }

  /**
   * Get a quotation by ID.
   */
  async findById(id: string): Promise<PrescriptionQuotation> {
    const quote = await this.quotationRepo.findOne({ where: { id }, relations: ['prescription'] });
    if (!quote) throw new NotFoundException('Quotation not found');

    // Auto expire check
    if (quote.status === 'pending' && new Date() > new Date(quote.expiresAt)) {
      quote.status = 'expired';
      await this.quotationRepo.save(quote);
    }

    return quote;
  }

  /**
   * Fetch all quotations for a prescription.
   */
  async findByPrescription(prescriptionId: string): Promise<PrescriptionQuotation[]> {
    return this.quotationRepo.find({ where: { prescriptionId }, order: { createdAt: 'DESC' } });
  }

  /**
   * Customer: Accept quote and convert it to an order.
   */
  async acceptQuotation(id: string, userId: string, dto: { addressId: string; paymentMethod: string; notes?: string }): Promise<any> {
    const quote = await this.findById(id);
    if (quote.status !== 'pending') {
      throw new BadRequestException(`Quotation cannot be accepted. Status is: ${quote.status}`);
    }

    if (new Date() > new Date(quote.expiresAt)) {
      quote.status = 'expired';
      await this.quotationRepo.save(quote);
      throw new BadRequestException('Quotation has expired.');
    }

    // Convert items format for placeOrder (pass all details for manual validation)
    const orderItems = quote.items.map(item => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      name: item.name,
      mrp: Number(item.mrp),
      brand: item.brand,
      strength: item.strength,
      isManual: (item as any).isManual || item.medicineId.startsWith('manual-'),
    }));

    // Call pharmaOrdersService to place the order
    const order = await this.pharmaOrdersService.placeOrder(userId, {
      addressId: dto.addressId,
      items: orderItems,
      prescriptionId: quote.prescriptionId,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes || `Prescription order converted from quote ${quote.id}`,
    });

    quote.status = 'accepted';
    await this.quotationRepo.save(quote);

    return {
      message: 'Quotation accepted and order placed successfully',
      order,
      quotation: quote,
    };
  }

  /**
   * Customer: Reject quote.
   */
  async rejectQuotation(id: string, userId: string): Promise<PrescriptionQuotation> {
    const quote = await this.findById(id);
    if (quote.status !== 'pending') {
      throw new BadRequestException(`Quotation cannot be rejected. Status is: ${quote.status}`);
    }

    quote.status = 'rejected';
    return this.quotationRepo.save(quote);
  }
}
