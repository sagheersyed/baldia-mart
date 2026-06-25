import {
  Controller, Get, Post, Body, Query, UseGuards, Param,
  Req, Inject, forwardRef,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from '../wallets/wallet.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { SettingsService } from '../settings/settings.service';

import { Order } from '../orders/order.entity';
import { WalletsService } from '../wallets/wallets.service';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  // REBUILD TRIGGER: Registering newly implemented User endpoints (Summary/Statement)
  constructor(
    private readonly financeService: FinanceService,
    private readonly entityManager: EntityManager,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly settingsService: SettingsService,
  ) {}

  // ── Admin Endpoints ───────────────────────────────────────────

  /**
   * TASK 2-B: Manual Reconciliation Webhook/Endpoint
   * Used when a rider pays jazzcash/easypaisa to clear their cash debt.
   */
  @Post('admin/reconcile-cash')
  async reconcileCash(@Body() body: { riderId: string; amount: number; referenceId: string }) {
    return this.entityManager.transaction(async manager => {
      return this.financeService.reconcileRiderCash(body.riderId, body.amount, body.referenceId, manager);
    });
  }

  @Post('admin/manual-adjustment')
  async manualAdjustment(@Body() dto: any, @Req() req: any) {
    return this.entityManager.transaction(async manager => {
      return this.financeService.executeLedgerTransaction(manager, 'MANUAL_ADJUSTMENT', dto.referenceId || 'manual', dto.description, [
        {
          walletId: dto.walletId,
          accountTag: dto.accountTag || 'EARNINGS',
          direction: dto.direction,
          amount: dto.amount,
          description: dto.description
        }
      ]);
    });
  }

  @Get('admin/daily-snapshots')
  async getDailySnapshots(@Query('from') from: string, @Query('to') to: string) {
    const query = this.entityManager.getRepository(DailyFinancialSnapshot).createQueryBuilder('s');
    if (from) query.andWhere('s.snapshotDate >= :from', { from: new Date(from) });
    if (to) query.andWhere('s.snapshotDate <= :to', { to: new Date(to) });
    query.orderBy('s.snapshotDate', 'DESC');
    return query.getMany();
  }

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
        // We use the existing logic in WalletsService which is protected by unique WalletSettlement records
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

  @Get('admin/platform-summary')
  async getPlatformSummary() {
     return this.financeService.getPortfolioSummary();
  }

  @Get('admin/leaderboard')
  async getLeaderboard(@Query('type') type: 'Rider' | 'Vendor', @Query('limit') limit: number) {
     return this.financeService.getFinancialLeaderboard(type, limit || 5);
  }

  // ── Vendor & Rider Endpoints ──────────────────────────────────

  @Get('vendor/summary')
  async getVendorSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Vendor' } });
    if (!wallet) return null;
    return {
      balance: wallet.balance,
      updatedAt: wallet.updatedAt
    };
  }

  @Get('rider/summary')
  async getRiderSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Rider' } });
    if (!wallet) return null;

    const threshold = await this.settingsService.getNumber('rider_cod_threshold', 5000);

    return {
      netBalance: Number(wallet.balance),
      codOutstanding: Number(wallet.cashInHand),
      isSuspended: wallet.isSuspended,
      limit: threshold,
      totalEarnings: Number(wallet.balance) + Number(wallet.cashInHand)
    };
  }

  @Get('user/summary')
  async getUserSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'User' } });
    if (!wallet) return { balance: 0 };
    return {
      balance: Number(wallet.balance),
      updatedAt: wallet.updatedAt
    };
  }

  @Get('user/statement')
  async getUserStatement(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'User' } });
    if (!wallet) return [];
    return this.financeService.getWalletStatement(wallet.id);
  }

  @Get('rider/statement')
  async getRiderStatement(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Rider' } });
    if (!wallet) return [];
    return this.financeService.getWalletStatement(wallet.id);
  }
}
