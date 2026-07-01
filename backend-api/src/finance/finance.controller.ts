import {
  Controller, Get, Post, Put, Delete, Body, Query, UseGuards, Param,
  Req, Inject, forwardRef, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from '../wallets/wallet.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { CommissionConfig } from './entities/commission-config.entity';
import { SettingsService } from '../settings/settings.service';

import { Order } from '../orders/order.entity';
import { WalletsService } from '../wallets/wallets.service';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { TenantGuard } from '../cms/guards/tenant.guard';
import { TenantRoles } from '../cms/decorators/tenant-roles.decorator';
import { ManualAdjustmentDto, CreateCommissionConfigDto } from './dto/finance-ops.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly entityManager: EntityManager,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(CommissionConfig)
    private readonly commissionConfigRepo: Repository<CommissionConfig>,
    private readonly settingsService: SettingsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS (Protected with AdminRoleGuard)
  // ═══════════════════════════════════════════════════════════════

  /**
   * SRS 3.C.4: Manual Cash Reconciliation
   * Used when a rider pays via JazzCash/EasyPaisa/Office to clear cash debt.
   */
  @Post('admin/reconcile-cash')
  @UseGuards(AdminRoleGuard)
  async reconcileCash(@Body() body: { riderId: string; amount: number; referenceId: string }) {
    if (!body.riderId || !body.amount || !body.referenceId) {
      throw new BadRequestException('riderId, amount, and referenceId are required');
    }
    return this.entityManager.transaction(async manager => {
      return this.financeService.reconcileRiderCash(body.riderId, body.amount, body.referenceId, manager);
    });
  }

  /**
   * SRS 3.C.5: Administrative Refund Trigger
   * Generates contra-accounting entries for a specific order.
   */
  @Post('admin/refund-order')
  @UseGuards(AdminRoleGuard)
  async refundOrder(@Body() body: { orderId: string }) {
    if (!body.orderId) throw new BadRequestException('orderId is required');
    return this.entityManager.transaction(async manager => {
      return this.financeService.processOrderRefund(body.orderId, manager);
    });
  }

  /**
   * Manual Ledger Adjustment with proper DTO validation
   */
  @Post('admin/manual-adjustment')
  @UseGuards(AdminRoleGuard)
  async manualAdjustment(@Body() dto: ManualAdjustmentDto) {
    return this.entityManager.transaction(async manager => {
      return this.financeService.executeLedgerTransaction(
        manager,
        'MANUAL_ADJUSTMENT',
        dto.referenceId || 'manual',
        dto.description,
        [{
          walletId: dto.walletId,
          accountTag: 'EARNINGS',
          direction: dto.direction,
          amount: dto.amount,
          description: dto.description,
        }]
      );
    });
  }

  /**
   * SRS 3.C.6: Audit Log — Daily Financial Snapshots
   */
  @Get('admin/daily-snapshots')
  @UseGuards(AdminRoleGuard)
  async getDailySnapshots(@Query('from') from: string, @Query('to') to: string) {
    const query = this.entityManager.getRepository(DailyFinancialSnapshot).createQueryBuilder('s');
    if (from) query.andWhere('s.snapshotDate >= :from', { from: new Date(from) });
    if (to) query.andWhere('s.snapshotDate <= :to', { to: new Date(to) });
    query.orderBy('s.snapshotDate', 'DESC');
    return query.getMany();
  }

  /**
   * Admin: Re-verify and heal orphaned settlements
   */
  @Get('admin/sync-missing-settlements')
  @UseGuards(AdminRoleGuard)
  async syncMissingSettlements() {
    const orders = await this.entityManager.getRepository(Order).find({
      where: { status: 'delivered' },
      relations: ['items', 'items.product', 'items.menuItem', 'items.medicine', 'subOrders', 'subOrders.vendor', 'subOrders.restaurant', 'subOrders.pharmacy', 'restaurant', 'pharmacy']
    });

    let synced = 0;
    let skipped = 0;

    for (const order of orders) {
      try {
        await this.entityManager.transaction(async (manager) => {
          await this.walletsService.processOrderSettlement(order, manager);
        });
        synced++;
      } catch (err) {
        skipped++;
      }
    }

    return { 
      message: 'Settlement sync completed', 
      totalProcessed: orders.length, 
      newlySettled: synced, 
      alreadySettled: skipped 
    };
  }

  /**
   * SRS 3.C.1: Live Financial KPIs — Real-Time SQL Aggregations
   */
  @Get('admin/platform-summary')
  @UseGuards(AdminRoleGuard)
  async getPlatformSummary() {
     return this.financeService.getPortfolioSummary();
  }

  /**
   * Admin: Financial Leaderboard (Top vendors or riders)
   */
  @Get('admin/leaderboard')
  @UseGuards(AdminRoleGuard)
  async getLeaderboard(@Query('type') type: 'Rider' | 'Vendor', @Query('limit') limit: number) {
     return this.financeService.getFinancialLeaderboard(type, limit || 5);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMISSION CONFIG CRUD (SRS 3.C.3)
  // ═══════════════════════════════════════════════════════════════

  /**
   * List all commission configs with optional filters
   */
  @Get('admin/commission-configs')
  @UseGuards(AdminRoleGuard)
  async getCommissionConfigs(
    @Query('entityType') entityType?: string,
    @Query('moduleType') moduleType?: string,
  ) {
    const query = this.commissionConfigRepo.createQueryBuilder('c');
    if (entityType) query.andWhere('c.entityType = :entityType', { entityType });
    if (moduleType) query.andWhere('c.moduleType = :moduleType', { moduleType });
    query.orderBy('c.createdAt', 'DESC');
    return query.getMany();
  }

  /**
   * Create a new commission config entry
   */
  @Post('admin/commission-configs')
  @UseGuards(AdminRoleGuard)
  async createCommissionConfig(@Body() dto: CreateCommissionConfigDto) {
    const config = this.commissionConfigRepo.create({
      entityType: dto.entityType,
      entityId: dto.entityId || null,
      commissionPercent: dto.commissionPercent,
      minCommission: dto.minCommission || 0,
      maxCommission: dto.maxCommission || 0,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      isActive: true,
      moduleType: dto.moduleType || 'all',
    } as any);
    return this.commissionConfigRepo.save(config);
  }

  /**
   * Update an existing commission config
   */
  @Put('admin/commission-configs/:id')
  @UseGuards(AdminRoleGuard)
  async updateCommissionConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCommissionConfigDto>,
  ) {
    const config = await this.commissionConfigRepo.findOne({ where: { id } });
    if (!config) throw new BadRequestException('Commission config not found');

    if (dto.commissionPercent !== undefined) config.commissionPercent = dto.commissionPercent;
    if (dto.minCommission !== undefined) config.minCommission = dto.minCommission;
    if (dto.maxCommission !== undefined) config.maxCommission = dto.maxCommission;
    if (dto.effectiveFrom) config.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo) config.effectiveTo = new Date(dto.effectiveTo);
    if ((dto as any).isActive !== undefined) config.isActive = (dto as any).isActive;
    if ((dto as any).moduleType) config.moduleType = (dto as any).moduleType;

    return this.commissionConfigRepo.save(config);
  }

  /**
   * Deactivate a commission config (soft-delete — zero-deletion policy)
   */
  @Delete('admin/commission-configs/:id')
  @UseGuards(AdminRoleGuard)
  async deleteCommissionConfig(@Param('id', ParseUUIDPipe) id: string) {
    const config = await this.commissionConfigRepo.findOne({ where: { id } });
    if (!config) throw new BadRequestException('Commission config not found');
    config.isActive = false;
    await this.commissionConfigRepo.save(config);
    return { success: true, message: 'Commission config deactivated' };
  }

  // ═══════════════════════════════════════════════════════════════
  // VENDOR ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('vendor/summary')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @TenantRoles('owner', 'manager')
  async getVendorSummary(@Req() req: any) {
    const vendorId = req.tenantUser.tenant?.entityId;
    if (!vendorId) throw new BadRequestException('No vendor linked to this tenant context.');

    const wallet = await this.walletRepo.findOne({ where: { userId: vendorId, userType: 'Vendor' } });
    if (!wallet) return { netBalance: 0, totalEarnings: 0, totalCommissions: 0 };

    return this.financeService.getPortfolioSummary(wallet.id);
  }

  @Get('vendor/statement')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @TenantRoles('owner', 'manager')
  async getVendorStatement(@Req() req: any) {
    const vendorId = req.tenantUser.tenant?.entityId;
    if (!vendorId) throw new BadRequestException('No vendor linked to this tenant context.');

    const wallet = await this.walletRepo.findOne({ where: { userId: vendorId, userType: 'Vendor' } });
    if (!wallet) return [];

    return this.financeService.getWalletStatement(wallet.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // RIDER ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('rider/summary')
  async getRiderSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Rider' } });
    if (!wallet) return { netBalance: 0, codOutstanding: 0, totalEarnings: 0, limit: 5000 };

    const summary = await this.financeService.getPortfolioSummary(wallet.id);
    const threshold = await this.settingsService.getNumber('rider_cod_threshold', 5000);

    return {
      ...summary,
      codOutstanding: Number(wallet.cashInHand),
      limit: threshold,
    };
  }

  @Get('rider/statement')
  async getRiderStatement(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Rider' } });
    if (!wallet) return [];
    return this.financeService.getWalletStatement(wallet.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // USER ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('user/summary')
  async getUserSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'User' } });
    if (!wallet) return { balance: 0, netBalance: 0 };
    return {
      balance: Number(wallet.balance),
      netBalance: Number(wallet.balance),
      updatedAt: wallet.updatedAt
    };
  }

  @Get('user/statement')
  async getUserStatement(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'User' } });
    if (!wallet) return [];
    return this.financeService.getWalletStatement(wallet.id);
  }
}
