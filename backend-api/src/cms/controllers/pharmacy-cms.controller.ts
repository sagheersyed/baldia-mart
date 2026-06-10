import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantRoles } from '../decorators/tenant-roles.decorator';
import { ChangeRequestService } from '../services/change-request.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyInventory } from '../../pharma/pharmacies/pharmacy-inventory.entity';
import { Pharmacy } from '../../pharma/pharmacies/pharmacy.entity';
import { Tenant } from '../entities/tenant.entity';
import { Medicine } from '../../pharma/medicines/medicine.entity';

/**
 * Pharmacy CMS — endpoints for pharmacists to manage their medicine inventory.
 *
 * NOTE: All pharmacy changes are routed through manual moderation by default
 * due to regulatory compliance requirements. Only stock quantity adjustments
 * may be auto-approved.
 */
@Controller('cms/pharmacy')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PharmacyCmsController {
  constructor(
    private readonly crService: ChangeRequestService,
    @InjectRepository(PharmacyInventory)
    private readonly invRepo: Repository<PharmacyInventory>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
  ) {}

  /** Get all master medicines that are NOT currently in this pharmacy's inventory. */
  @Get('catalog')
  @TenantRoles('owner', 'pharmacist', 'assistant_pharmacist')
  async getMasterCatalog(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    if (!tenant?.entityId) return { data: [], total: 0 };

    const take = Number(limit) || 20;
    const skip = ((Number(page) || 1) - 1) * take;

    const existingMedicines = await this.invRepo.find({
      where: { pharmacyId: tenant.entityId },
      select: ['medicineId'],
    });
    const excludedIds = existingMedicines.map(em => em.medicineId);

    // Also exclude items that are currently pending a CREATE request
    const pendingCRs = await this.crService.listByTenant(req.tenantId, {
      entityType: 'PharmacyInventory',
    });
    const pendingMedicineIds = pendingCRs.data
      .filter(cr => (cr.status === 'submitted' || cr.status === 'under_review') && cr.actionType === 'CREATE')
      .map(cr => cr.patchData?.medicineId)
      .filter(Boolean);

    const allExcludedIds = [...new Set([...excludedIds, ...pendingMedicineIds])];

    const qb = this.medicineRepo.createQueryBuilder('medicine')
      .leftJoinAndSelect('medicine.brand', 'brand')
      .where('medicine.isActive = :isActive', { isActive: true });

    if (allExcludedIds.length > 0) {
      qb.andWhere('medicine.id NOT IN (:...allExcludedIds)', { allExcludedIds });
    }

    if (search) {
      qb.andWhere('LOWER(medicine.name) LIKE :search OR LOWER(medicine.genericName) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    qb.orderBy('medicine.name', 'ASC').take(take).skip(skip);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** List all medicines stocked in this pharmacy. */
  @Get('medicines')
  @TenantRoles('owner', 'pharmacist', 'assistant_pharmacist')
  async listMedicines(@Req() req: any) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    if (!tenant?.entityId) return [];
    return this.invRepo.find({
      where: { pharmacyId: tenant.entityId },
      relations: ['medicine', 'medicine.brand'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Toggle pharmacy medicine availability (auto-approved). */
  @Put('medicines/:pmId/availability')
  @TenantRoles('owner', 'pharmacist', 'assistant_pharmacist')
  async toggleAvailability(
    @Req() req: any,
    @Param('pmId') pmId: string,
    @Body() dto: { isAvailable: boolean },
  ) {
    const pm = await this.invRepo.findOne({
      where: { id: pmId },
      relations: ['medicine'],
    });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'PharmacyInventory',
      entityId: pmId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/isAvailable', value: dto.isAvailable, oldValue: pm?.isAvailable },
      ],
      preChangeSnapshot: pm ? { isAvailable: pm.isAvailable, name: pm.medicine?.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Update stock quantity for a medicine (may be auto-approved). */
  @Put('medicines/:pmId/stock')
  @TenantRoles('owner', 'pharmacist', 'assistant_pharmacist')
  async updateStock(
    @Req() req: any,
    @Param('pmId') pmId: string,
    @Body() dto: { quantity: number },
  ) {
    const pm = await this.invRepo.findOne({
      where: { id: pmId },
      relations: ['medicine'],
    });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'PharmacyInventory',
      entityId: pmId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/stockQuantity', value: dto.quantity, oldValue: pm?.stockQuantity },
      ],
      preChangeSnapshot: pm ? { stockQuantity: pm.stockQuantity, name: pm.medicine?.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Update selling price for a medicine (requires moderation). */
  @Post('medicines/:pmId/update-price')
  @TenantRoles('owner', 'pharmacist')
  async requestPriceUpdate(
    @Req() req: any,
    @Param('pmId') pmId: string,
    @Body() dto: { newPrice: number },
  ) {
    const pm = await this.invRepo.findOne({
      where: { id: pmId },
      relations: ['medicine'],
    });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'PharmacyInventory',
      entityId: pmId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/sellingPrice', value: dto.newPrice, oldValue: pm?.sellingPrice },
      ],
      preChangeSnapshot: pm ? { sellingPrice: pm.sellingPrice, name: pm.medicine?.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to add a new medicine to this pharmacy's inventory (from master catalog). */
  @Post('medicines/new')
  @TenantRoles('owner', 'pharmacist')
  async requestNewMedicine(
    @Req() req: any,
    @Body() dto: {
      medicineId: string;
      stockQuantity: number;
      sellingPrice?: number;
      batchNumber?: string;
    },
  ) {
    const medicine = await this.medicineRepo.findOne({ where: { id: dto.medicineId } });
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'PharmacyInventory',
      actionType: 'CREATE',
      patchData: {
        pharmacyId: tenant?.entityId,
        medicineId: dto.medicineId,
        stockQuantity: dto.stockQuantity,
        sellingPrice: dto.sellingPrice ?? null,
        batchNumber: dto.batchNumber ?? null,
        isAvailable: true,
      },
      preChangeSnapshot: medicine ? { name: medicine.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Update pharmacy profile (hours, contact — requires moderation). */
  @Post('profile/update')
  @TenantRoles('owner', 'pharmacist')
  async updateProfile(
    @Req() req: any,
    @Body() dto: {
      openingTime?: string;
      closingTime?: string;
      is24Hours?: boolean;
      phoneNumber?: string;
    },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    const pharmacy = tenant?.entityId
      ? await this.pharmacyRepo.findOne({ where: { id: tenant.entityId } })
      : null;

    const patches: any[] = [];
    if (dto.openingTime !== undefined) {
      patches.push({ op: 'replace', path: '/openingTime', value: dto.openingTime, oldValue: pharmacy?.openingTime });
    }
    if (dto.closingTime !== undefined) {
      patches.push({ op: 'replace', path: '/closingTime', value: dto.closingTime, oldValue: pharmacy?.closingTime });
    }
    if (dto.is24Hours !== undefined) {
      patches.push({ op: 'replace', path: '/is24Hours', value: dto.is24Hours, oldValue: pharmacy?.is24Hours });
    }
    if (dto.phoneNumber !== undefined) {
      patches.push({ op: 'replace', path: '/phoneNumber', value: dto.phoneNumber, oldValue: pharmacy?.phoneNumber });
    }

    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'Pharmacy',
      entityId: tenant?.entityId,
      actionType: 'UPDATE',
      patchData: patches,
      preChangeSnapshot: pharmacy ? {
        openingTime: pharmacy.openingTime,
        closingTime: pharmacy.closingTime,
        is24Hours: pharmacy.is24Hours,
        phoneNumber: pharmacy.phoneNumber,
      } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to add a brand new medicine to the master catalog. */
  @Post('medicines/request-new')
  @TenantRoles('owner', 'pharmacist')
  async requestBrandNewMedicine(
    @Req() req: any,
    @Body() dto: {
      name: string;
      genericName?: string;
      brand?: string;
      mrp: number;
      dosageForm?: string;
      strength?: string;
      packSize?: string;
      imageUrl?: string;
      requiresPrescription?: boolean;
      stockQuantity: number;
    },
  ) {
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'Medicine',
      actionType: 'CREATE',
      patchData: {
        ...dto,
        isActive: true,
      },
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** List change request history for this pharmacy. */
  @Get('change-requests')
  @TenantRoles('owner', 'pharmacist')
  async listChangeRequests(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.crService.listByTenant(req.tenantId, {
      status,
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
    });
  }
}
