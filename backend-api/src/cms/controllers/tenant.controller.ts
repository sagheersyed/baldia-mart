import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Req, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import * as bcrypt from 'bcryptjs';

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
}
