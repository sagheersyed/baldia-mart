import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Observable } from 'rxjs';
import { Medicine } from '../medicines/medicine.entity';
import { Prescription } from '../prescriptions/prescription.entity';
import { PrescriptionQuotation } from '../prescriptions/prescription-quotation.entity';
import { ComplianceService } from './compliance.service';

/**
 * ControlledSubstanceInterceptor — Intercepts order placement and quotation requests
 * to check if any of the items are controlled/narcotic substances. Enforces strict
 * regulatory check on the linked prescription validity and logs compliance trails.
 */
@Injectable()
export class ControlledSubstanceInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionQuotation)
    private readonly quotationRepo: Repository<PrescriptionQuotation>,
    private readonly complianceService: ComplianceService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { body, user, method, url } = request;
    const userId = user?.id || user?.sub;

    const isPlaceOrder = url.includes('/pharma/orders') && method === 'POST';
    const isGenerateQuotation = url.includes('/pharma/quotations') && method === 'POST' && !url.includes('/accept') && !url.includes('/reject');
    const isAcceptQuotation = url.includes('/pharma/quotations') && url.includes('/accept') && method === 'POST';

    if (!isPlaceOrder && !isGenerateQuotation && !isAcceptQuotation) {
      return next.handle();
    }

    let items: { medicineId: string; quantity: number }[] = [];
    let prescriptionId = body.prescriptionId;

    if (isPlaceOrder || isGenerateQuotation) {
      items = body.items || [];
    } else if (isAcceptQuotation) {
      const qid = request.params.id;
      const quote = await this.quotationRepo.findOne({ where: { id: qid } });
      if (quote) {
        prescriptionId = quote.prescriptionId;
        items = quote.items.map(i => ({ medicineId: i.medicineId, quantity: i.quantity }));
      }
    }

    if (!items.length) {
      return next.handle();
    }

    // 1. Fetch medicines (filter out manual items starting with 'manual-')
    const medicineIds = items.map(i => i.medicineId).filter(id => id && !id.startsWith('manual-'));
    const medicines = medicineIds.length > 0
      ? await this.medicineRepo.find({ where: { id: In(medicineIds) } })
      : [];

    // 2. Check for controlled substances
    const controlledItems = medicines.filter(m => m.isControlled);
    if (controlledItems.length === 0) {
      return next.handle();
    }

    const controlledNames = controlledItems.map(m => m.name).join(', ');

    // 3. Validate prescription is present
    if (!prescriptionId) {
      await this.complianceService.log({
        eventType: 'controlled_purchase_attempt',
        userId,
        details: `Blocked purchase/quote attempt for controlled drug(s) (${controlledNames}) without a prescription.`,
        severity: 'critical',
        actorType: userId ? 'user' : 'system',
      });
      throw new BadRequestException(`Prescription is required to purchase controlled substances: ${controlledNames}`);
    }

    const prescription = await this.prescriptionRepo.findOne({ where: { id: prescriptionId } });

    if (!prescription) {
      await this.complianceService.log({
        eventType: 'controlled_purchase_attempt',
        userId,
        prescriptionId,
        details: `Blocked purchase/quote attempt for controlled drug(s) (${controlledNames}) with invalid prescription ID.`,
        severity: 'critical',
        actorType: userId ? 'user' : 'system',
      });
      throw new BadRequestException('Valid prescription not found.');
    }

    // 4. Validate prescription owner
    if (prescription.userId !== userId) {
      await this.complianceService.log({
        eventType: 'controlled_purchase_attempt',
        userId,
        prescriptionId,
        details: `Blocked attempt by user ${userId} to use prescription of user ${prescription.userId} for controlled drug(s).`,
        severity: 'critical',
        actorType: userId ? 'user' : 'system',
      });
      throw new BadRequestException('Prescription does not belong to your user account.');
    }

    // 5. Validate status
    if (prescription.status !== 'approved' && prescription.status !== 'partially_approved') {
      await this.complianceService.log({
        eventType: 'controlled_purchase_attempt',
        userId,
        prescriptionId,
        details: `Blocked attempt for controlled drug(s) using unapproved prescription. Status is: ${prescription.status}`,
        severity: 'critical',
        actorType: userId ? 'user' : 'system',
      });
      throw new BadRequestException(`Prescription status is ${prescription.status}. It must be approved before purchasing.`);
    }

    // 6. Validate validity period
    if (prescription.validUntil && new Date() > new Date(prescription.validUntil)) {
      await this.complianceService.log({
        eventType: 'controlled_purchase_attempt',
        userId,
        prescriptionId,
        details: `Blocked attempt for controlled drug(s) using expired prescription (valid until: ${prescription.validUntil}).`,
        severity: 'critical',
        actorType: userId ? 'user' : 'system',
      });
      throw new BadRequestException('The validity period of this prescription has expired.');
    }

    // 7. Validate refills
    if (prescription.refillsUsed >= prescription.maxRefills) {
      await this.complianceService.log({
        eventType: 'controlled_purchase_attempt',
        userId,
        prescriptionId,
        details: `Blocked attempt for controlled drug(s) using prescription with exhausted refills (${prescription.refillsUsed}/${prescription.maxRefills}).`,
        severity: 'critical',
        actorType: userId ? 'user' : 'system',
      });
      throw new BadRequestException('All approved refills for this prescription have been exhausted.');
    }

    // 8. Success logging
    await this.complianceService.log({
      eventType: 'controlled_purchase_attempt',
      userId,
      prescriptionId,
      details: `Authorized purchase request for controlled drug(s) (${controlledNames}) using approved prescription #${prescription.id.slice(0, 8)}. Refills: ${prescription.refillsUsed}/${prescription.maxRefills}`,
      severity: 'info',
      actorType: userId ? 'user' : 'system',
    });

    return next.handle();
  }
}
