import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacy } from './pharmacy.entity';
import { PharmacyInventory } from './pharmacy-inventory.entity';
import { DeliveryZone } from '../../delivery-zones/delivery-zone.entity';

@Injectable()
export class PharmaciesService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyInventory)
    private readonly inventoryRepo: Repository<PharmacyInventory>,
    @InjectRepository(DeliveryZone)
    private readonly zoneRepo: Repository<DeliveryZone>,
  ) {}

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
      where: { isActive: true, isVerified: true },
      order: { rating: 'DESC', name: 'ASC' },
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

  async addInventoryItem(pharmacyId: string, data: Partial<PharmacyInventory>) {
    const existing = await this.inventoryRepo.findOne({
      where: { pharmacyId, medicineId: data.medicineId },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.inventoryRepo.save(existing);
    }

    const newItem = this.inventoryRepo.create({ ...data, pharmacyId });
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
    });
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
   * Find the best pharmacy for an order based on availability + proximity.
   */
  async findBestPharmacy(
    medicineId: string,
    quantity: number,
    lat?: number,
    lng?: number,
  ): Promise<Pharmacy | null> {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.pharmacy', 'p')
      .where('inv.medicine_id = :medicineId', { medicineId })
      .andWhere('inv.is_available = true')
      .andWhere('inv.is_quarantined = false')
      .andWhere('(inv.stock_quantity - inv.reserved_quantity) >= :qty', { qty: quantity })
      .andWhere('p.is_active = true AND p.is_verified = true AND p.is_open = true');

    if (lat && lng) {
      qb.addOrderBy(
        `(6371 * acos(cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(p.latitude))))`,
        'ASC',
      );
    }

    const result = await qb.getOne();
    return result?.pharmacy || null;
  }

  // ── Onboarding ────────────────────────────────────────────────

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
