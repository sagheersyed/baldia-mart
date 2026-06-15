import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThanOrEqual } from 'typeorm';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { CommissionConfig } from './entities/commission-config.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { Wallet } from '../wallets/wallet.entity';
import { Order } from '../orders/order.entity';
import { format } from 'date-fns';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(FinancialLedgerEntry)
    private ledgerRepo: Repository<FinancialLedgerEntry>,
    @InjectRepository(CommissionConfig)
    private commissionRepo: Repository<CommissionConfig>,
    @InjectRepository(DailyFinancialSnapshot)
    private snapshotRepo: Repository<DailyFinancialSnapshot>,
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
  ) {}

  /**
   * Records a categorized financial movement in the ledger.
   * Calculates running balance atomically within the provided transaction manager.
   */
  async recordEntry(
    manager: EntityManager,
    params: {
      walletId: string;
      orderId?: string;
      entryType: string;
      direction: 'CREDIT' | 'DEBIT';
      amount: number;
      description: string;
      referenceId?: string;
      metadata?: Record<string, any>;
      adminId?: string;
    },
  ) {
    const { walletId, amount, direction } = params;

    // 1. Lock wallet and get current balance
    const wallet = await manager.findOne(Wallet, {
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) throw new Error(`Wallet ${walletId} not found`);

    // 2. Calculate new balance
    const currentBalance = Number(wallet.balance);
    const change = direction === 'CREDIT' ? Number(amount) : -Number(amount);
    const newBalance = currentBalance + change;

    // 3. Create ledger entry
    const entry = manager.create(FinancialLedgerEntry, {
      ...params,
      runningBalance: newBalance,
      periodKey: format(new Date(), 'yyyy-MM'),
    });

    await manager.save(entry);

    // 4. Update wallet balance
    wallet.balance = newBalance;
    await manager.save(wallet);

    return entry;
  }

  /**
   * Resolves the applicable commission rate for a vendor/vertical.
   * Priority: Specific entity config > Vertical default > Platform default (10%)
   */
  async getCommissionRate(
    entityType: 'vendor' | 'restaurant' | 'pharmacy',
    entityId: string,
  ): Promise<{ percent: number; min: number; max: number }> {
    const now = new Date();

    // 1. Check for specific entity config
    const specific = await this.commissionRepo.findOne({
      where: {
        entityId,
        entityType,
        isActive: true,
        // effectiveFrom <= now AND (effectiveTo IS NULL OR effectiveTo >= now)
      },
      order: { createdAt: 'DESC' },
    });

    if (specific) return { percent: Number(specific.commissionPercent), min: Number(specific.minCommission), max: Number(specific.maxCommission) };

    // 2. Check for vertical default
    const verticalDefault = await this.commissionRepo.findOne({
      where: {
        entityType,
        entityId: null as any,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (verticalDefault) return { percent: Number(verticalDefault.commissionPercent), min: Number(verticalDefault.minCommission), max: Number(verticalDefault.maxCommission) };

    // 3. Check for platform absolute default
    const platformDefault = await this.commissionRepo.findOne({
      where: {
        entityType: 'platform_default' as any,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (platformDefault) return { percent: Number(platformDefault.commissionPercent), min: Number(platformDefault.minCommission), max: Number(platformDefault.maxCommission) };

    // 4. Fallback
    return { percent: 10, min: 0, max: 0 };
  }

  /**
   * Helper to calculate platform commission for an amount based on resolved config
   */
  calculateCommission(amount: number, config: { percent: number; min: number; max: number }): number {
    let commission = amount * (config.percent / 100);
    if (config.min > 0) commission = Math.max(commission, config.min);
    if (config.max > 0) commission = Math.min(commission, config.max);
    return Number(commission.toFixed(2));
  }

  /**
   * Returns a financial summary for a wallet over a period
   */
  async getWalletStatement(walletId: string, fromDate?: Date, toDate?: Date) {
    const query = this.ledgerRepo.createQueryBuilder('entry')
      .where('entry.walletId = :walletId', { walletId })
      .orderBy('entry.createdAt', 'DESC');

    if (fromDate) query.andWhere('entry.createdAt >= :fromDate', { fromDate });
    if (toDate) query.andWhere('entry.createdAt <= :toDate', { toDate });

    return query.getMany();
  }

  /**
   * Processes the financial settlement of a completed order.
   * This is the heart of the financial engine.
   */
  async processOrderSettlement(order: Order, manager: EntityManager) {
    const orderRef = order.id.split('-')[0].toUpperCase();
    const isCOD = order.paymentMethod === 'cash_on_delivery';
    const riderId = order.riderId;

    // 1. Resolve Rider Earnings
    let pharmaBonus = 0;
    if (order.orderType === 'pharma') {
      if (order.priority === 'high') pharmaBonus += 50;
      if (order.isColdChain) pharmaBonus += 30;
    }
    const deliveryFee = Number(order.deliveryFee);
    const riderTakeHome = deliveryFee + pharmaBonus;

    // 2. Identify all Vendors involved (Mart/Pharma/Food)
    const stakeholders: { vendorId: string; subtotal: number; type: 'vendor'|'restaurant'|'pharmacy' }[] = [];
    
    if (order.subOrders && order.subOrders.length > 0) {
      for (const sub of order.subOrders) {
        const vId = sub.vendorId || sub.restaurantId || sub.pharmacyId;
        const vType = sub.pharmacyId ? 'pharmacy' : sub.restaurantId ? 'restaurant' : 'vendor';
        if (vId) {
          stakeholders.push({ vendorId: vId, subtotal: Number(sub.subtotal), type: vType });
        }
      }
    } else {
      // Legacy or single-vendor fallback
      const vId = order.restaurantId || order.pharmacyId || order.martId;
      const vType = order.pharmacyId ? 'pharmacy' : order.restaurantId ? 'restaurant' : 'vendor';
      if (vId) {
        stakeholders.push({ vendorId: vId, subtotal: Number(order.subtotal), type: vType });
      }
    }

    // 3. Process each stakeholder
    for (const sh of stakeholders) {
      const config = await this.getCommissionRate(sh.type, sh.vendorId);
      const commission = this.calculateCommission(sh.subtotal, config);
      const vendorNet = sh.subtotal - commission;

      const vendorWallet = await manager.findOne(Wallet, { where: { userId: sh.vendorId, userType: 'Vendor' } });
      if (!vendorWallet) continue;

      if (isCOD) {
        // Rider has the cash. Vendor is credited their net amount.
        // Platform keeps commission (implied as rider owes it to platform).
        await this.recordEntry(manager, {
          walletId: vendorWallet.id,
          orderId: order.id,
          entryType: 'VENDOR_PAYOUT',
          direction: 'CREDIT',
          amount: vendorNet,
          description: `Earnings for Order #${orderRef} (Net of ${config.percent}% commission)`,
          metadata: { subtotal: sh.subtotal, commission, rate: config.percent }
        });
      } else {
        // Platform has the cash. Vendor is credited their net amount.
        await this.recordEntry(manager, {
          walletId: vendorWallet.id,
          orderId: order.id,
          entryType: 'VENDOR_PAYOUT',
          direction: 'CREDIT',
          amount: vendorNet,
          description: `Online Earnings for Order #${orderRef} (Net of ${config.percent}% commission)`,
          metadata: { subtotal: sh.subtotal, commission, rate: config.percent }
        });
      }
    }

    // 4. Process Rider
    if (riderId) {
      const riderWallet = await manager.findOne(Wallet, { where: { userId: riderId, userType: 'Rider' } });
      if (riderWallet) {
        if (isCOD) {
          // Rider owes platform: Total Collected - Rider Take Home
          const totalCollected = Number(order.total);
          const deficit = totalCollected - riderTakeHome;
          
          await this.recordEntry(manager, {
            walletId: riderWallet.id,
            orderId: order.id,
            entryType: 'COD_COLLECTION',
            direction: 'DEBIT',
            amount: deficit,
            description: `Cash collection for #${orderRef} (Owed to Platform & Vendors)`,
            metadata: { totalCollected, riderTakeHome }
          });
        } else {
          // Platform owes rider their take-home
          await this.recordEntry(manager, {
            walletId: riderWallet.id,
            orderId: order.id,
            entryType: 'RIDER_DELIVERY_FEE',
            direction: 'CREDIT',
            amount: riderTakeHome,
            description: `Delivery earnings for Order #${orderRef}`,
            metadata: { deliveryFee, pharmaBonus }
          });
        }
      }
    }
  }

  /**
   * Generates a high-level portfolio summary for a specific wallet or platform.
   * Smart Optimization: Uses pre-computed snapshots for historical data and 
   * only queries the ledger for entries created since the last snapshot.
   */
  async getPortfolioSummary(walletId?: string, userType?: 'Rider' | 'Vendor' | 'Platform') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get historical aggregates from snapshots
    const snapQuery = this.snapshotRepo.createQueryBuilder('snap')
      .where('snap.snapshotDate < :today', { today });

    if (walletId) {
      snapQuery.andWhere('snap.walletId = :walletId', { walletId });
    } else if (userType) {
      snapQuery.andWhere('snap.userType = :userType', { userType });
    }

    const historical = await snapQuery
      .select([
        'SUM(snap.gross_revenue) as total_earnings',
        'SUM(snap.total_commissions) as total_commissions',
        'SUM(snap.cod_collected - snap.cod_remitted) as cod_outstanding',
        'SUM(snap.net_revenue) as net_revenue_historical'
      ])
      .getRawOne();

    // 2. Get today's real-time delta from ledger
    const ledgerQuery = this.ledgerRepo.createQueryBuilder('entry')
      .where('entry.createdAt >= :today', { today });

    if (walletId) {
      ledgerQuery.andWhere('entry.walletId = :walletId', { walletId });
    } else if (userType && userType !== 'Platform') {
      ledgerQuery.innerJoin(Wallet, 'w', 'w.id = entry.walletId')
                 .andWhere('w.userType = :userType', { userType });
    }

    const todayStats = await ledgerQuery
      .select([
        'SUM(CASE WHEN entry.entryType IN (\'VENDOR_PAYOUT\', \'RIDER_DELIVERY_FEE\', \'RIDER_BONUS\', \'RIDER_TIP\') THEN entry.amount ELSE 0 END) as total_earnings',
        'SUM(CASE WHEN entry.entryType = \'PLATFORM_COMMISSION\' THEN entry.amount ELSE 0 END) as total_commissions',
        'SUM(CASE WHEN entry.entryType = \'COD_COLLECTION\' THEN entry.amount ELSE 0 END) as cod_collected',
        'SUM(CASE WHEN entry.entryType = \'COD_REMITTANCE\' THEN entry.amount ELSE 0 END) as cod_remitted',
        'SUM(CASE WHEN entry.direction = \'CREDIT\' THEN entry.amount ELSE -entry.amount END) as net_balance_delta',
      ])
      .getRawOne();

    // 3. Current Live Balance (From Wallet directly for O(1))
    let liveBalance = 0;
    if (walletId) {
      const w = await this.walletRepo.findOne({ where: { id: walletId } });
      liveBalance = Number(w?.balance || 0);
    } else {
       // For Platform/Global, we sum up the deltas
       liveBalance = Number(historical.net_revenue_historical || 0) + Number(todayStats.net_balance_delta || 0);
    }

    return {
      totalEarnings: Number(historical.total_earnings || 0) + Number(todayStats.total_earnings || 0),
      totalCommissions: Number(historical.total_commissions || 0) + Number(todayStats.total_commissions || 0),
      codOutstanding: Number(historical.cod_outstanding || 0) + (Number(todayStats.cod_collected || 0) - Number(todayStats.cod_remitted || 0)),
      netBalance: liveBalance,
    };
  }

  /**
   * Builds the daily financial snapshot.
   * Typically called by a cron job at 00:01 daily for the previous day.
   */
  async generateDailySnapshot(date: Date, walletId?: string) {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const platformStats = await this.ledgerRepo.createQueryBuilder('entry')
      .where('entry.createdAt BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .select([
        'COUNT(DISTINCT entry.orderId) as total_orders',
        'SUM(CASE WHEN entry.entryType = \'ORDER_SUBTOTAL\' THEN entry.amount ELSE 0 END) as gross_revenue',
        'SUM(CASE WHEN entry.entryType = \'PLATFORM_COMMISSION\' THEN entry.amount ELSE 0 END) as total_commissions',
        'SUM(CASE WHEN entry.entryType = \'DELIVERY_FEE\' THEN entry.amount ELSE 0 END) as total_delivery_fees',
        'SUM(CASE WHEN entry.entryType = \'REFUND\' THEN entry.amount ELSE 0 END) as total_refunds',
      ])
      .getRawOne();

    const snapshot = this.snapshotRepo.create({
      snapshotDate: dayStart,
      userType: 'Platform',
      totalOrders: Number(platformStats.total_orders || 0),
      grossRevenue: Number(platformStats.gross_revenue || 0),
      totalCommissions: Number(platformStats.total_commissions || 0),
      totalDeliveryFees: Number(platformStats.total_delivery_fees || 0),
      totalRefunds: Number(platformStats.total_refunds || 0),
      netRevenue: Number(platformStats.total_commissions || 0) + Number(platformStats.total_delivery_fees || 0),
    });

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * Returns top financial performers based on gross revenue/snapshots.
   * Smart Business Intelligence for Admins.
   */
  async getFinancialLeaderboard(userType: 'Rider' | 'Vendor', limit = 5) {
    return this.snapshotRepo.createQueryBuilder('snap')
      .where('snap.userType = :userType', { userType })
      .select([
        'snap.walletId as "walletId"',
        'snap.entityName as "entityName"',
        'SUM(snap.grossRevenue) as "totalRevenue"',
        'SUM(snap.totalOrders) as "totalOrders"',
      ])
      .groupBy('snap.walletId')
      .addGroupBy('snap.entityName')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
