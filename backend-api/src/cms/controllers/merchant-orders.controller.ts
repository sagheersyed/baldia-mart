import {
  Controller, Get, Put, Body, Param, Query,
  UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantRoles } from '../decorators/tenant-roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../../orders/order.entity';
import { Tenant } from '../entities/tenant.entity';

/**
 * Merchant Orders — endpoints for store owners to manage their incoming orders.
 */
@Controller('cms/orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MerchantOrdersController {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /** List orders for the current merchant/tenant. */
  @Get()
  @TenantRoles('owner', 'manager', 'staff', 'pharmacist', 'chef')
  async listOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantRepo.findOneOrFail({ where: { id: tenantId } });
    const entityId = tenant.entityId;

    if (!entityId) return { data: [], total: 0 };

    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('items.medicine', 'medicine')
      .orderBy('order.createdAt', 'DESC');

    // Filter by Vertical Entity ID
    if (tenant.type === 'grocery' || tenant.type === 'mart') qb.where('order.martId = :entityId', { entityId });
    else if (tenant.type === 'food' || tenant.type === 'restaurant') qb.where('order.restaurantId = :entityId', { entityId });
    else if (tenant.type === 'pharma' || tenant.type === 'pharmacy') qb.where('order.pharmacyId = :entityId', { entityId });

    if (status && status !== 'all') {
      const statusList = status.split(',');
      qb.andWhere('order.status IN (:...statusList)', { statusList });
    }

    const take = Number(limit) || 20;
    const skip = Number(offset) || 0;
    qb.take(take).skip(skip);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** Update order status (Accept, Ready, etc.). */
  @Put(':id/status')
  @TenantRoles('owner', 'manager', 'staff', 'pharmacist', 'chef')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { status: string },
  ) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantRepo.findOneOrFail({ where: { id: tenantId } });
    const entityId = tenant.entityId;

    const order = await this.orderRepo.findOneOrFail({ where: { id } });

    // Security check: ensure order belongs to this tenant
    const belongsToTenant = 
      (tenant.type === 'grocery' || tenant.type === 'mart') ? order.martId === entityId :
      (tenant.type === 'food' || tenant.type === 'restaurant') ? order.restaurantId === entityId :
      (tenant.type === 'pharma' || tenant.type === 'pharmacy') ? order.pharmacyId === entityId : false;

    if (!belongsToTenant) {
      throw new BadRequestException('Order does not belong to this store.');
    }

    // Allowed status transitions for merchants
    const allowed = ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled'];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Status "${dto.status}" is not manageable by merchant.`);
    }

    await this.orderRepo.update(id, { status: dto.status });
    return this.orderRepo.findOneOrFail({ where: { id }, relations: ['items'] });
  }

  /** Get specific order detail. */
  @Get(':id')
  @TenantRoles('owner', 'manager', 'staff', 'pharmacist', 'chef')
  async getOrderDetail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    const tenant = await this.tenantRepo.findOneOrFail({ where: { id: tenantId } });
    const entityId = tenant.entityId;

    const order = await this.orderRepo.findOneOrFail({
      where: { id },
      relations: ['user', 'address', 'items', 'items.product', 'items.menuItem', 'items.medicine', 'rider'],
    });

    const belongsToTenant = 
      (tenant.type === 'grocery' || tenant.type === 'mart') ? order.martId === entityId :
      (tenant.type === 'food' || tenant.type === 'restaurant') ? order.restaurantId === entityId :
      (tenant.type === 'pharma' || tenant.type === 'pharmacy') ? order.pharmacyId === entityId : false;

    if (!belongsToTenant) {
      throw new BadRequestException('Order access denied.');
    }

    return order;
  }
}
