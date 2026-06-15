import {
  Controller, Get, Post, Body, Query, UseGuards, Param,
  InternalServerErrorException, Req,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCommissionConfigDto, ManualAdjustmentDto } from './dto/finance-ops.dto';
import { EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from '../wallets/wallet.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { Repository } from 'typeorm';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly entityManager: EntityManager,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  // ── Admin Endpoints ───────────────────────────────────────────

  @Get('admin/platform-summary')
  async getPlatformSummary() {
    return this.financeService.getPortfolioSummary(undefined, 'Platform');
  }

  @Get('admin/daily-snapshots')
  async getDailySnapshots(@Query('from') from: string, @Query('to') to: string) {
    const query = this.entityManager.getRepository(DailyFinancialSnapshot).createQueryBuilder('s');
    if (from) query.andWhere('s.snapshotDate >= :from', { from: new Date(from) });
    if (to) query.andWhere('s.snapshotDate <= :to', { to: new Date(to) });
    query.orderBy('s.snapshotDate', 'DESC');
    return query.getMany();
  }

  @Get('admin/leaderboard')
  async getLeaderboard(@Query('type') type: 'Rider' | 'Vendor', @Query('limit') limit: string) {
    return this.financeService.getFinancialLeaderboard(type || 'Vendor', parseInt(limit) || 5);
  }

  @Post('admin/manual-adjustment')
  async manualAdjustment(@Body() dto: ManualAdjustmentDto, @Req() req: any) {
    return this.entityManager.transaction(async manager => {
      return this.financeService.recordEntry(manager, {
        ...dto,
        entryType: 'MANUAL_ADJUSTMENT',
        adminId: req.user.id,
      });
    });
  }

  // ── Vendor Endpoints ──────────────────────────────────────────

  @Get('vendor/statement')
  async getVendorStatement(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Vendor' } });
    if (!wallet) return [];
    return this.financeService.getWalletStatement(wallet.id);
  }

  @Get('vendor/summary')
  async getVendorSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Vendor' } });
    if (!wallet) return null;
    return this.financeService.getPortfolioSummary(wallet.id);
  }

  // ── Rider Endpoints ───────────────────────────────────────────

  @Get('rider/summary')
  async getRiderSummary(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Rider' } });
    if (!wallet) return null;
    return this.financeService.getPortfolioSummary(wallet.id);
  }

  @Get('rider/statement')
  async getRiderStatement(@Req() req: any) {
    const wallet = await this.walletRepo.findOne({ where: { userId: req.user.id, userType: 'Rider' } });
    if (!wallet) return [];
    return this.financeService.getWalletStatement(wallet.id);
  }
}
