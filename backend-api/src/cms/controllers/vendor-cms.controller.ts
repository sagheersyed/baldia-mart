import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantRoles } from '../decorators/tenant-roles.decorator';
import { ChangeRequestService } from '../services/change-request.service';
import { GetUser } from '../../auth/get-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorProduct } from '../../vendors/vendor-product.entity';
import { Tenant } from '../entities/tenant.entity';
import { Product } from '../../products/product.entity';
import { Vendor } from '../../vendors/vendor.entity';

/**
 * Vendor CMS — endpoints for grocery/mart vendors to manage their products.
 *
 * Low-risk operations (stock, availability toggles) go through auto-approval.
 * High-risk operations (price changes, new products) are routed to admin review.
 */
@Controller('cms/vendor')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VendorCmsController {
  constructor(
    private readonly crService: ChangeRequestService,
    @InjectRepository(VendorProduct)
    private readonly vpRepo: Repository<VendorProduct>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
  ) {}

  /** Get all master products that are NOT currently in this vendor's store. */
  @Get('catalog')
  @TenantRoles('owner', 'manager', 'staff')
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

    // Subquery: get product IDs already in vendor's catalog
    const existingProducts = await this.vpRepo.find({
      where: { vendorId: tenant.entityId },
      select: ['productId'],
    });
    const excludedIds = existingProducts.map(ep => ep.productId);

    // Also exclude items that are currently pending a CREATE request
    const pendingCRs = await this.crService.listByTenant(req.tenantId, {
      entityType: 'VendorProduct',
    });
    const pendingProductIds = pendingCRs.data
      .filter(cr => (cr.status === 'submitted' || cr.status === 'under_review') && cr.actionType === 'CREATE')
      .map(cr => cr.patchData?.productId)
      .filter(Boolean);

    const allExcludedIds = [...new Set([...excludedIds, ...pendingProductIds])];

    const qb = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.isActive = :isActive', { isActive: true });

    if (allExcludedIds.length > 0) {
      qb.andWhere('product.id NOT IN (:...allExcludedIds)', { allExcludedIds });
    }

    if (search) {
      qb.andWhere('LOWER(product.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    qb.orderBy('product.name', 'ASC').take(take).skip(skip);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** List all products assigned to this vendor's store. */
  @Get('products')
  @TenantRoles('owner', 'manager', 'staff')
  async listProducts(@Req() req: any) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    if (!tenant?.entityId) return [];
    return this.vpRepo.find({
      where: { vendorId: tenant.entityId },
      relations: ['product', 'product.category', 'product.brand'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Request a product price update. */
  @Post('products/:productId/update-price')
  @TenantRoles('owner', 'manager')
  async requestPriceUpdate(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: { newPrice: number },
  ) {
    const vp = await this.vpRepo.findOne({
      where: { id: productId },
      relations: ['product'],
    });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'VendorProduct',
      entityId: productId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/price', value: dto.newPrice, oldValue: vp?.price },
      ],
      preChangeSnapshot: vp ? { price: vp.price, stockQty: vp.stockQty, name: vp.product?.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Update stock quantity (auto-approved via rule engine). */
  @Put('products/:productId/stock')
  @TenantRoles('owner', 'manager', 'staff')
  async updateStock(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: { quantity: number },
  ) {
    const vp = await this.vpRepo.findOne({
      where: { id: productId },
      relations: ['product'],
    });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'VendorProduct',
      entityId: productId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/stockQty', value: dto.quantity, oldValue: vp?.stockQty },
      ],
      preChangeSnapshot: vp ? { stockQty: vp.stockQty, name: vp.product?.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Toggle product availability (auto-approved). */
  @Put('products/:productId/availability')
  @TenantRoles('owner', 'manager', 'staff')
  async toggleAvailability(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: { isAvailable: boolean },
  ) {
    const vp = await this.vpRepo.findOne({
      where: { id: productId },
      relations: ['product'],
    });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'VendorProduct',
      entityId: productId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/isAvailable', value: dto.isAvailable, oldValue: vp?.isAvailable },
      ],
      preChangeSnapshot: vp ? { isAvailable: vp.isAvailable, name: vp.product?.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to add a new product to the vendor's catalog. */
  @Post('products/new')
  @TenantRoles('owner', 'manager')
  async requestNewProduct(
    @Req() req: any,
    @Body() dto: {
      productId: string;
      price: number;
      stockQty: number;
    },
  ) {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'VendorProduct',
      actionType: 'CREATE',
      patchData: {
        vendorId: tenant?.entityId,
        productId: dto.productId,
        price: dto.price,
        stockQty: dto.stockQty,
        isAvailable: true,
      },
      preChangeSnapshot: product ? { name: product.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to add a brand new product to the master catalog. */
  @Post('products/request-new')
  @TenantRoles('owner', 'manager')
  async requestBrandNewProduct(
    @Req() req: any,
    @Body() dto: {
      name: string;
      description?: string;
      price: number;
      categoryId: string;
      brandId?: string;
      imageUrl?: string;
      unit?: string;
      weight?: string;
      stockQty: number;
    },
  ) {
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'Product',
      actionType: 'CREATE',
      patchData: {
        ...dto,
        isActive: true,
      },
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to update vendor profile (hours, location). */
  @Post('profile/update')
  @TenantRoles('owner', 'manager')
  async updateProfile(
    @Req() req: any,
    @Body() dto: {
      openingTime?: string;
      closingTime?: string;
      offDays?: string;
      fridayOpeningTime?: string;
      fridayClosingTime?: string;
      address?: string;
      location?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    const vendor = tenant?.entityId
      ? await this.vendorRepo.findOne({ where: { id: tenant.entityId } })
      : null;

    const patches: any[] = [];
    if (dto.openingTime !== undefined) {
      patches.push({ op: 'replace', path: '/openingTime', value: dto.openingTime, oldValue: vendor?.openingTime });
    }
    if (dto.closingTime !== undefined) {
      patches.push({ op: 'replace', path: '/closingTime', value: dto.closingTime, oldValue: vendor?.closingTime });
    }
    if (dto.offDays !== undefined) {
      patches.push({ op: 'replace', path: '/offDays', value: dto.offDays, oldValue: (vendor as any)?.offDays });
    }
    if (dto.fridayOpeningTime !== undefined) {
      patches.push({ op: 'replace', path: '/fridayOpeningTime', value: dto.fridayOpeningTime, oldValue: (vendor as any)?.fridayOpeningTime });
    }
    if (dto.fridayClosingTime !== undefined) {
      patches.push({ op: 'replace', path: '/fridayClosingTime', value: dto.fridayClosingTime, oldValue: (vendor as any)?.fridayClosingTime });
    }
    if (dto.address !== undefined) {
      patches.push({ op: 'replace', path: '/address', value: dto.address, oldValue: vendor?.address });
    }
    if (dto.location !== undefined) {
      patches.push({ op: 'replace', path: '/location', value: dto.location, oldValue: vendor?.location });
    }
    if (dto.lat !== undefined) {
      patches.push({ op: 'replace', path: '/lat', value: dto.lat, oldValue: vendor?.lat });
    }
    if (dto.lng !== undefined) {
      patches.push({ op: 'replace', path: '/lng', value: dto.lng, oldValue: vendor?.lng });
    }

    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'Vendor',
      entityId: tenant?.entityId,
      actionType: 'UPDATE',
      patchData: patches,
      preChangeSnapshot: vendor ? {
        openingTime: vendor.openingTime,
        closingTime: vendor.closingTime,
        offDays: (vendor as any).offDays,
        fridayOpeningTime: (vendor as any).fridayOpeningTime,
        fridayClosingTime: (vendor as any).fridayClosingTime,
        address: vendor.address,
        location: vendor.location,
        lat: vendor.lat,
        lng: vendor.lng,
      } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** List change request history for this vendor. */
  @Get('change-requests')
  @TenantRoles('owner', 'manager')
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
