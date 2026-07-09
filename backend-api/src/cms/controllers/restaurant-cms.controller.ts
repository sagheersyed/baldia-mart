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
import { MenuItem } from '../../menu-items/menu-item.entity';
import { Restaurant } from '../../restaurants/restaurant.entity';
import { Tenant } from '../entities/tenant.entity';

/**
 * Restaurant CMS — endpoints for restaurant owners to manage their menus,
 * pricing, categories, and availability.
 */
@Controller('cms/restaurant')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RestaurantCmsController {
  constructor(
    private readonly crService: ChangeRequestService,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /** List all menu items for this restaurant. */
  @Get('menu-items')
  @TenantRoles('owner', 'manager', 'staff')
  async listMenuItems(@Req() req: any) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    if (!tenant?.entityId) return [];
    return this.menuItemRepo.find({
      where: { restaurantId: tenant.entityId },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  /** Request a menu item price update. */
  @Post('menu-items/:itemId/update-price')
  @TenantRoles('owner', 'manager')
  async requestPriceUpdate(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: { newPrice: number },
  ) {
    const item = await this.menuItemRepo.findOne({ where: { id: itemId } });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'MenuItem',
      entityId: itemId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/price', value: dto.newPrice, oldValue: item?.price },
      ],
      preChangeSnapshot: item ? { price: item.price, name: item.name } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Toggle menu item availability (auto-approved). */
  @Put('menu-items/:itemId/availability')
  @TenantRoles('owner', 'manager', 'staff')
  async toggleAvailability(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: { isAvailable: boolean },
  ) {
    const item = await this.menuItemRepo.findOne({ where: { id: itemId } });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'MenuItem',
      entityId: itemId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/isAvailable', value: dto.isAvailable, oldValue: item?.isAvailable },
      ],
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to add a new menu item. */
  @Post('menu-items/new')
  @TenantRoles('owner', 'manager')
  async requestNewMenuItem(
    @Req() req: any,
    @Body() dto: {
      name: string;
      description?: string;
      price: number;
      category?: string;
      imageUrl?: string;
      prepTimeMinutes?: number;
    },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'MenuItem',
      actionType: 'CREATE',
      patchData: {
        restaurantId: tenant?.entityId,
        ...dto,
        isAvailable: true,
      },
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to update restaurant business hours. */
  @Post('profile/hours')
  @TenantRoles('owner', 'manager')
  async updateBusinessHours(
    @Req() req: any,
    @Body() dto: { openingTime: string; closingTime: string },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    const restaurant = tenant?.entityId
      ? await this.restaurantRepo.findOne({ where: { id: tenant.entityId } })
      : null;

    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'Restaurant',
      entityId: tenant?.entityId,
      actionType: 'UPDATE',
      patchData: [
        { op: 'replace', path: '/openingTime', value: dto.openingTime, oldValue: restaurant?.openingTime },
        { op: 'replace', path: '/closingTime', value: dto.closingTime, oldValue: restaurant?.closingTime },
      ],
      preChangeSnapshot: restaurant
        ? { openingTime: restaurant.openingTime, closingTime: restaurant.closingTime }
        : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** Request to update restaurant profile (hours, days off, location). */
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
      location?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: req.tenantId } });
    const restaurant = tenant?.entityId
      ? await this.restaurantRepo.findOne({ where: { id: tenant.entityId } })
      : null;

    const patches: any[] = [];
    if (dto.openingTime !== undefined) {
      patches.push({ op: 'replace', path: '/openingTime', value: dto.openingTime, oldValue: restaurant?.openingTime });
    }
    if (dto.closingTime !== undefined) {
      patches.push({ op: 'replace', path: '/closingTime', value: dto.closingTime, oldValue: restaurant?.closingTime });
    }
    if (dto.offDays !== undefined) {
      patches.push({ op: 'replace', path: '/offDays', value: dto.offDays, oldValue: (restaurant as any)?.offDays });
    }
    if (dto.fridayOpeningTime !== undefined) {
      patches.push({ op: 'replace', path: '/fridayOpeningTime', value: dto.fridayOpeningTime, oldValue: (restaurant as any)?.fridayOpeningTime });
    }
    if (dto.fridayClosingTime !== undefined) {
      patches.push({ op: 'replace', path: '/fridayClosingTime', value: dto.fridayClosingTime, oldValue: (restaurant as any)?.fridayClosingTime });
    }
    if (dto.location !== undefined) {
      patches.push({ op: 'replace', path: '/location', value: dto.location, oldValue: restaurant?.location });
    }
    if (dto.latitude !== undefined) {
      patches.push({ op: 'replace', path: '/latitude', value: dto.latitude, oldValue: restaurant?.latitude });
    }
    if (dto.longitude !== undefined) {
      patches.push({ op: 'replace', path: '/longitude', value: dto.longitude, oldValue: restaurant?.longitude });
    }

    return this.crService.create({
      tenantId: req.tenantId,
      entityType: 'Restaurant',
      entityId: tenant?.entityId,
      actionType: 'UPDATE',
      patchData: patches,
      preChangeSnapshot: restaurant ? {
        openingTime: restaurant.openingTime,
        closingTime: restaurant.closingTime,
        offDays: (restaurant as any).offDays,
        fridayOpeningTime: (restaurant as any).fridayOpeningTime,
        fridayClosingTime: (restaurant as any).fridayClosingTime,
        location: restaurant.location,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      } : null,
      requestedBy: req.user.id,
      submitImmediately: true,
    });
  }

  /** List change request history for this restaurant. */
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
