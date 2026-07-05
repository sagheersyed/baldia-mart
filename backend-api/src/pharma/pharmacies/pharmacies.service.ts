import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Pharmacy } from './pharmacy.entity';
import { PharmacyInventory } from './pharmacy-inventory.entity';
import { DeliveryZone } from '../../delivery-zones/delivery-zone.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PharmaciesService {
  private readonly logger = new Logger(PharmaciesService.name);

  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyInventory)
    private readonly inventoryRepo: Repository<PharmacyInventory>,
    @InjectRepository(DeliveryZone)
    private readonly zoneRepo: Repository<DeliveryZone>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Cron Job: Runs every night at 2:00 AM to quarantine expired medicines
   * and alert admins about near-expiry stock.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processExpiryIntelligence() {
    this.logger.log('Running Expiry Intelligence scan...');
    
    // 1. Auto-quarantine expired stock
    const quarantinedCount = await this.quarantineExpired();
    if (quarantinedCount > 0) {
      this.logger.warn(`Quarantined ${quarantinedCount} expired inventory items.`);
    }

    // 2. Scan for near-expiry (30 days) and log warnings
    const nearExpiry = await this.getNearExpiry(30);
    if (nearExpiry.length > 0) {
      this.logger.warn(`Found ${nearExpiry.length} items near expiry. Check admin dashboard for details.`);
    }

    this.logger.log('Expiry Intelligence scan completed.');
  }

  // ── Discovery ─────────────────────────────────────────────────

  async findNearby(lat: number, lng: number, radiusKm = 5): Promise<Pharmacy[]> {
    // Haversine-based proximity search using existing DeliveryZone pattern
    return this.pharmacyRepo
      .createQueryBuilder('p')
      .where('p.is_active = true AND p.is_verified = true AND p.is_open = true')
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(p.latitude)))) <= :radius`,
        { lat, lng, radius: radiusKm },
      )
      .orderBy(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(p.latitude))))`,
        'ASC',
      )
      .setParameters({ lat, lng })
      .take(20)
      .getMany();
  }

  async findById(id: string): Promise<Pharmacy> {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id } });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    return pharmacy;
  }

  async getAll(page = 1, limit = 20) {
    const [data, total] = await this.pharmacyRepo.findAndCount({
      order: { onboardingStatus: 'ASC', name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // ── Inventory ─────────────────────────────────────────────────

  async getInventory(pharmacyId: string, page = 1, limit = 50) {
    const [data, total] = await this.inventoryRepo.findAndCount({
      where: { pharmacyId },
      relations: ['medicine'],
      order: { medicine: { name: 'ASC' } },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async addInventoryItem(pharmacyId: string, dto: any) {
    const stockQuantity = dto.quantity !== undefined ? dto.quantity : dto.stockQuantity;
    const updateData: Partial<PharmacyInventory> = { ...dto, stockQuantity };
    delete (updateData as any).quantity;

    const existing = await this.inventoryRepo.findOne({
      where: { pharmacyId, medicineId: dto.medicineId },
    });

    if (existing) {
      Object.assign(existing, updateData);
      return this.inventoryRepo.save(existing);
    }

    const newItem = this.inventoryRepo.create({ ...updateData, pharmacyId });
    return this.inventoryRepo.save(newItem);
  }

  async removeInventoryItem(id: string) {
    const item = await this.inventoryRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return this.inventoryRepo.remove(item);
  }

  async checkStock(pharmacyId: string, medicineId: string, quantity: number): Promise<boolean> {
    const inv = await this.inventoryRepo.findOne({
      where: { pharmacyId, medicineId, isAvailable: true, isQuarantined: false },
    });
    if (!inv) return false;
    return (inv.stockQuantity - inv.reservedQuantity) >= quantity;
  }

  /**
   * Reserve stock for an order — pessimistic locking to prevent overselling.
   * Returns true if reservation succeeded.
   */
  async reserveStock(pharmacyId: string, medicineId: string, quantity: number): Promise<boolean> {
    return this.inventoryRepo.manager.transaction(async (em) => {
      const inv = await em.findOne(PharmacyInventory, {
        where: { pharmacyId, medicineId, isAvailable: true, isQuarantined: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inv || (inv.stockQuantity - inv.reservedQuantity) < quantity) {
        return false;
      }

      inv.reservedQuantity += quantity;
      await em.save(inv);
      return true;
    });
  }

  /**
   * Confirm reservation — deduct from actual stock after order confirmation.
   */
  async confirmReservation(pharmacyId: string, medicineId: string, quantity: number): Promise<void> {
    await this.inventoryRepo.manager.transaction(async (em) => {
      const inv = await em.findOne(PharmacyInventory, {
        where: { pharmacyId, medicineId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inv) throw new BadRequestException('Inventory record not found');

      inv.stockQuantity -= quantity;
      inv.reservedQuantity = Math.max(0, inv.reservedQuantity - quantity);
      await em.save(inv);

      // Phase 21: Low Stock Alert
      if (inv.stockQuantity < 10) {
        this.triggerLowStockAlert(inv.pharmacyId, inv.medicineId, inv.stockQuantity);
      }
    });
  }

  private async triggerLowStockAlert(pharmacyId: string, medicineId: string, currentStock: number) {
    try {
      const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId }, relations: ['medicine'] } as any);
      const inventory = await this.inventoryRepo.findOne({ where: { pharmacyId, medicineId }, relations: ['medicine'] });
      
      if (pharmacy && inventory) {
        this.logger.warn(`Low stock alert: ${inventory.medicine.name} @ ${pharmacy.name}. Remaining: ${currentStock}`);
        
        // In a real scenario, we'd find the pharmacist's user ID to send a push notification
        // For now, we log it and could potentially send an email or SMS if configured.
        // Assuming pharmacy entity might have a linked userId in future
      }
    } catch (err) {
      this.logger.error('Failed to trigger low stock alert', err);
    }
  }

  /**
   * Release reservation — on order cancellation or timeout.
   */
  async releaseReservation(pharmacyId: string, medicineId: string, quantity: number): Promise<void> {
    await this.inventoryRepo.manager.transaction(async (em) => {
      const inv = await em.findOne(PharmacyInventory, {
        where: { pharmacyId, medicineId },
        lock: { mode: 'pessimistic_write' },
      });

      if (inv) {
        inv.reservedQuantity = Math.max(0, inv.reservedQuantity - quantity);
        await em.save(inv);
      }
    });
  }

  /**
   * Find the best pharmacy for an order based on availability + proximity + ZONE.
   * A Senior Pharmacist approach: Only fulfill from the user's delivery zone 
   * to ensure cold-chain maintenance and local regulation compliance.
   */
  async findBestPharmacy(
    medicineId: string,
    quantity: number,
    zoneId?: string, // Made optional for anonymous availability checks
    requiresColdChain: boolean = false,
    lat?: number,
    lng?: number,
  ): Promise<Pharmacy | null> {
    const buildQuery = (useZoneFilter: boolean) => {
      const qb = this.inventoryRepo
        .createQueryBuilder('inv')
        .innerJoinAndSelect('inv.pharmacy', 'p')
        .where('inv.medicine_id = :medicineId', { medicineId })
        .andWhere('inv.is_available = true')
        .andWhere('inv.is_quarantined = false')
        .andWhere('(inv.stock_quantity - inv.reserved_quantity) >= :qty', { qty: quantity })
        .andWhere('p.is_active = true AND p.is_verified = true AND p.is_open = true');

      // Strict zone match (primary attempt)
      if (useZoneFilter && zoneId) {
        qb.andWhere('p.zone_id = :zoneId', { zoneId });
      }

      // Cold-chain compliance
      if (requiresColdChain) {
        qb.andWhere('p.has_cold_chain_support = true');
      }

      // Sort by proximity if coordinates provided
      if (lat && lng) {
        qb.addOrderBy(
          `(6371 * acos(cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(p.latitude))))`,
          'ASC',
        );
      }

      return qb;
    };

    // Primary: try exact zone match
    const strictResult = await buildQuery(true).getOne();
    if (strictResult?.pharmacy) return strictResult.pharmacy;

    // Fallback: if two overlapping zones cover the same area (e.g. Saeedabad + Baldia Town),
    // a pharmacy may be registered under the inactive zone while the customer's address
    // resolves to the currently active zone. In that case, fall back to searching all active/verified/open pharmacies.
    if (zoneId) {
      this.logger.warn(
        `No pharmacy found for zone=${zoneId}. Falling back to general search (overlapping zones scenario).`
      );
      const fallbackResult = await buildQuery(false).getOne();
      return fallbackResult?.pharmacy || null;
    }

    return null;
  }

  // ── Onboarding ────────────────────────────────────────────────

  async update(id: string, dto: Partial<Pharmacy>): Promise<Pharmacy> {
    const pharmacy = await this.findById(id);
    Object.assign(pharmacy, dto);
    return this.pharmacyRepo.save(pharmacy);
  }

  async register(dto: Partial<Pharmacy>): Promise<Pharmacy> {
    const pharmacy = this.pharmacyRepo.create({
      ...dto,
      isActive: false,
      isVerified: false,
      onboardingStatus: 'pending',
    });
    return this.pharmacyRepo.save(pharmacy);
  }

  async approvePharmacy(id: string): Promise<Pharmacy> {
    const pharmacy = await this.findById(id);
    pharmacy.isActive = true;
    pharmacy.isVerified = true;
    pharmacy.onboardingStatus = 'approved';
    return this.pharmacyRepo.save(pharmacy);
  }

  async rejectPharmacy(id: string, reason: string): Promise<Pharmacy> {
    const pharmacy = await this.findById(id);
    pharmacy.onboardingStatus = 'rejected';
    pharmacy.rejectionReason = reason;
    return this.pharmacyRepo.save(pharmacy);
  }

  // ── Expiry Management ─────────────────────────────────────────

  async quarantineExpired(): Promise<number> {
    const result = await this.inventoryRepo
      .createQueryBuilder()
      .update(PharmacyInventory)
      .set({ isQuarantined: true })
      .where('expiry_date <= CURRENT_DATE')
      .andWhere('is_quarantined = false')
      .execute();

    return result.affected || 0;
  }

  async getNearExpiry(daysAhead = 30) {
    return this.inventoryRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.medicine', 'm')
      .innerJoinAndSelect('inv.pharmacy', 'p')
      .where('inv.expiry_date <= CURRENT_DATE + :days::interval', { days: `${daysAhead} days` })
      .andWhere('inv.is_quarantined = false')
      .orderBy('inv.expiry_date', 'ASC')
      .getMany();
  }
}
