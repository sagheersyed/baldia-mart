import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantRoles } from '../decorators/tenant-roles.decorator';
import { ChangeRequestService } from '../services/change-request.service';
import { GetUser } from '../../auth/get-user.decorator';

/**
 * Change Request controller — handles both merchant and admin operations.
 *
 * Merchant endpoints require tenant context (x-tenant-id header).
 * Admin endpoints require admin role.
 *
 * IMPORTANT: Static routes (admin/*, tenant/*) MUST be declared before
 * wildcard :id routes to prevent NestJS from swallowing them.
 */
@Controller('cms/change-requests')
@UseGuards(JwtAuthGuard)
export class ChangeRequestController {
  constructor(
    private readonly crService: ChangeRequestService,
  ) {}

  // ── Admin operations (MUST be before :id) ───────────────────

  /** Get the admin review queue. */
  @Get('admin/queue')
  @UseGuards(AdminRoleGuard)
  async getAdminQueue(
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.crService.getAdminQueue({
      status,
      entityType,
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
    });
  }

  /** Admin claims a change request for review. */
  @Put('admin/:id/claim')
  @UseGuards(AdminRoleGuard)
  async claim(@Param('id') id: string, @GetUser('id') adminId: string) {
    return this.crService.claim(id, adminId);
  }

  /** Admin approves a change request. */
  @Put('admin/:id/approve')
  @UseGuards(AdminRoleGuard)
  async approve(@Param('id') id: string, @GetUser('id') adminId: string) {
    return this.crService.approve(id, adminId);
  }

  /** Admin rejects a change request. */
  @Put('admin/:id/reject')
  @UseGuards(AdminRoleGuard)
  async reject(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
    @Body() dto: { reason: string },
  ) {
    return this.crService.reject(id, adminId, dto.reason);
  }

  // ── Merchant operations ──────────────────────────────────────

  /** Create and optionally submit a new change request. */
  @Post()
  @UseGuards(TenantGuard)
  @TenantRoles('owner', 'manager', 'pharmacist')
  async create(
    @Req() req: any,
    @Body() dto: {
      entityType: string;
      entityId?: string;
      actionType: string;
      patchData: any;
      preChangeSnapshot?: any;
      entityVersion?: number;
      submitImmediately?: boolean;
    },
  ) {
    return this.crService.create({
      tenantId: req.tenantId,
      requestedBy: req.user.id,
      ...dto,
    });
  }

  /** Submit a draft change request for review. */
  @Put(':id/submit')
  @UseGuards(TenantGuard)
  @TenantRoles('owner', 'manager', 'pharmacist')
  async submit(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.crService.submit(id, userId);
  }

  /** List change requests for the current tenant. */
  @Get('tenant/:tenantId')
  @UseGuards(TenantGuard)
  @TenantRoles('owner', 'manager', 'staff', 'pharmacist', 'assistant_pharmacist')
  async listByTenant(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.crService.listByTenant(tenantId, {
      status,
      entityType,
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
    });
  }

  // ── Discussion (static prefix before :id) ───────────────────

  @Post(':id/discussions')
  async addDiscussion(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: { message: string },
  ) {
    return this.crService.addDiscussion(id, userId, dto.message);
  }

  @Get(':id/discussions')
  async getDiscussions(@Param('id') id: string) {
    return this.crService.getDiscussions(id);
  }

  // ── Wildcard lookup (MUST be last) ──────────────────────────

  /** Get details of a specific change request. */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.crService.findOneOrFail(id);
  }
}
