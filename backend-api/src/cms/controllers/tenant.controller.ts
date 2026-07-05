import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Req, BadRequestException, ForbiddenException, Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantRoles } from '../decorators/tenant-roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { Order } from '../../orders/order.entity';
import { VendorProduct } from '../../vendors/vendor-product.entity';
import { MenuItem } from '../../menu-items/menu-item.entity';
import { PharmacyInventory } from '../../pharma/pharmacies/pharmacy-inventory.entity';
import { ChangeRequest } from '../entities/change-request.entity';
import * as bcrypt from 'bcryptjs';
import { Between, In, Not } from 'typeorm';

/**
 * Admin-only endpoints for managing tenants (businesses) and their memberships.
 */
@Controller('cms/tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantUser)
    private readonly tenantUserRepo: Repository<TenantUser>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(VendorProduct)
    private readonly vpRepo: Repository<VendorProduct>,
    @InjectRepository(MenuItem)
    private readonly menuRepo: Repository<MenuItem>,
    @InjectRepository(PharmacyInventory)
    private readonly phinvRepo: Repository<PharmacyInventory>,
    @InjectRepository(ChangeRequest)
    private readonly crRepo: Repository<ChangeRequest>,
  ) {}

  // ── Admin: Tenant CRUD ───────────────────────────────────────

  @Post()
  @UseGuards(AdminRoleGuard)
  async createTenant(@Body() dto: {
    name: string;
    type: string;
    entityId?: string;
    logoUrl?: string;
    bannerUrl?: string;
  }) {
    const tenant = this.tenantRepo.create({
      ...dto,
      status: 'active',
    });
    return this.tenantRepo.save(tenant);
  }

  @Get()
  @UseGuards(AdminRoleGuard)
  async listTenants(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const qb = this.tenantRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.members', 'members')
      .orderBy('t.created_at', 'DESC');

    if (type) qb.andWhere('t.type = :type', { type });
    if (status) qb.andWhere('t.status = :status', { status });

    qb.take(Number(limit) || 20).skip(Number(offset) || 0);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  @Get(':id')
  @UseGuards(AdminRoleGuard)
  async getTenant(@Param('id') id: string) {
    return this.tenantRepo.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  @Put(':id/status')
  @UseGuards(AdminRoleGuard)
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
  ) {
    await this.tenantRepo.update(id, { status: dto.status });
    return this.tenantRepo.findOneOrFail({ where: { id } });
  }

  // ── Admin: Tenant Membership ─────────────────────────────────

  @Post(':id/members')
  @UseGuards(AdminRoleGuard)
  async addMember(
    @Param('id') tenantId: string,
    @Body() dto: { userId: string; role: string },
  ) {
    const member = this.tenantUserRepo.create({
      tenantId,
      userId: dto.userId,
      role: dto.role,
    });
    return this.tenantUserRepo.save(member);
  }

  @Put(':tenantId/members/:memberId')
  @UseGuards(AdminRoleGuard)
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() dto: { role?: string; isActive?: boolean },
  ) {
    await this.tenantUserRepo.update(memberId, dto);
    return this.tenantUserRepo.findOneOrFail({ where: { id: memberId } });
  }

  @Delete(':tenantId/members/:memberId')
  @UseGuards(AdminRoleGuard)
  async removeMember(@Param('memberId') memberId: string) {
    await this.tenantUserRepo.delete(memberId);
    return { deleted: true };
  }

  // ── Merchant: Get my tenants ─────────────────────────────────

  @Get('my/list')
  async getMyTenants(@Req() req: any) {
    const userId = req.user.id;
    const memberships = await this.tenantUserRepo.find({
      where: { userId, isActive: true },
      relations: ['tenant'],
    });
    return memberships.map(m => ({
      tenantId: m.tenantId,
      name: m.tenant.name,
      type: m.tenant.type,
      status: m.tenant.status,
      role: m.role,
      logoUrl: m.tenant.logoUrl,
    }));
  }

  // ── Merchant: CMS PIN Management ───────────────────────────────

  @Get(':tenantId/pin-status')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getPinStatus(@Req() req: any) {
    const hasPin = !!req.tenantUser.cmsPin;
    return { hasPin };
  }

  @Post(':tenantId/setup-pin')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async setupPin(
    @Req() req: any,
    @Body() dto: { pin: string },
  ) {
    if (!dto.pin || dto.pin.length < 4) {
      throw new BadRequestException('PIN must be at least 4 characters long.');
    }
    const hashed = await bcrypt.hash(dto.pin, 10);
    await this.tenantUserRepo.update(req.tenantUser.id, { cmsPin: hashed });
    return { success: true };
  }

  @Post(':tenantId/verify-pin')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async verifyPin(
    @Req() req: any,
    @Body() dto: { pin: string },
  ) {
    if (!req.tenantUser.cmsPin) {
      throw new BadRequestException('No PIN setup for this account.');
    }
    const isMatch = await bcrypt.compare(dto.pin, req.tenantUser.cmsPin);
    if (!isMatch) {
      throw new ForbiddenException('Invalid PIN.');
    }
    return { success: true };
  }

  @Patch(':tenantId/profile')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @TenantRoles('owner', 'manager')
  async updateMyStoreProfile(
    @Req() req: any,
    @Body() dto: { 
      status?: string; 
      logoUrl?: string; 
      bannerUrl?: string;
      openingTime?: string;
      closingTime?: string;
    },
  ) {
    const tenantId = req.tenantId;
    await this.tenantRepo.update(tenantId, dto);
    return this.tenantRepo.findOneOrFail({ where: { id: tenantId } });
  }
  
  // ── Merchant Dashboard ───────────────────────────────────────
  
  @Get(':tenantId/dashboard')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getDashboardStats(@Req() req: any) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantRepo.findOneOrFail({ where: { id: tenantId } });
    const entityId = tenant.entityId;

    if (!entityId) {
      return { todayRevenue: 0, activeOrders: 0, totalInventory: 0, pendingRequests: 0 };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Today's Revenue & Active Orders
    const orderFilter: any = { createdAt: Between(startOfDay, endOfDay) };
    if (tenant.type === 'grocery' || tenant.type === 'mart') orderFilter.martId = entityId;
    else if (tenant.type === 'food' || tenant.type === 'restaurant') orderFilter.restaurantId = entityId;
    else if (tenant.type === 'pharma' || tenant.type === 'pharmacy') orderFilter.pharmacyId = entityId;

    const todayOrders = await this.orderRepo.find({
      where: { 
        ...orderFilter, 
        status: In(['confirmed', 'out_for_delivery', 'delivered']) 
      }
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const activeOrderFilter: any = {};
    if (tenant.type === 'grocery' || tenant.type === 'mart') activeOrderFilter.martId = entityId;
    else if (tenant.type === 'food' || tenant.type === 'restaurant') activeOrderFilter.restaurantId = entityId;
    else if (tenant.type === 'pharma' || tenant.type === 'pharmacy') activeOrderFilter.pharmacyId = entityId;

    const activeOrders = await this.orderRepo.count({
      where: {
        ...activeOrderFilter,
        status: Not(In(['delivered', 'cancelled']))
      }
    });

    // 2. Inventory Count
    let totalInventory = 0;
    if (tenant.type === 'grocery' || tenant.type === 'mart') {
      totalInventory = await this.vpRepo.count({ where: { vendorId: entityId } });
    } else if (tenant.type === 'food' || tenant.type === 'restaurant') {
      totalInventory = await this.menuRepo.count({ where: { restaurantId: entityId } });
    } else if (tenant.type === 'pharma' || tenant.type === 'pharmacy') {
      totalInventory = await this.phinvRepo.count({ where: { pharmacyId: entityId } });
    }

    // 3. Pending Change Requests
    const pendingRequests = await this.crRepo.count({
      where: {
        tenantId: tenantId,
        status: In(['submitted', 'under_review'])
      }
    });

    return {
      todayRevenue: Number(todayRevenue.toFixed(2)),
      activeOrders,
      totalInventory,
      pendingRequests,
      storeStatus: tenant.status,
    };
  }
}
