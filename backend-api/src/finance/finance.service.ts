import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { FinancialTransaction } from './entities/financial-transaction.entity';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { CommissionConfig } from './entities/commission-config.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { Wallet } from '../wallets/wallet.entity';
import { Order } from '../orders/order.entity';

import { SettingsService } from '../settings/settings.service';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(FinancialTransaction)
    private txRepo: Repository<FinancialTransaction>,
    @InjectRepository(FinancialLedgerEntry)
    private ledgerRepo: Repository<FinancialLedgerEntry>,
    @InjectRepository(CommissionConfig)
    private commissionRepo: Repository<CommissionConfig>,
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(DailyFinancialSnapshot)
    private snapshotRepo: Repository<DailyFinancialSnapshot>,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Finance Engine initialized. Checking for orphaned settlements...');
    // We don't want to block the app start, so we run this in background
    this.healOrphanedSettlements().catch(err => this.logger.error('Failed to heal settlements:', err));
  }

  async healOrphanedSettlements() {
    // This will try to settle any 'delivered' order. 
    // WalletsService.processOrderSettlement already has idempotency via WalletSettlement table.
    // Since I manually deleted the markers via psql, this will pick them up.
    
    const orders = await this.txRepo.manager.getRepository(Order).find({
      where: { status: 'delivered' },
      relations: ['items', 'items.product', 'items.menuItem', 'items.medicine', 'subOrders', 'subOrders.vendor', 'subOrders.restaurant', 'subOrders.pharmacy', 'restaurant', 'pharmacy']
    });

    this.logger.log(`Found ${orders.length} delivered orders. Re-verifying ledger entries...`);
    
    let healed = 0;
    for (const order of orders) {
      try {
        await this.txRepo.manager.transaction(async (manager) => {
          await this.walletsService.processOrderSettlement(order, manager);
        });
        healed++;
      } catch (err) {
        // Skip already settled
      }
    }
    if (healed > 0) this.logger.log(`Healed ${healed} financial settlements.`);
  }

  /**
   * TASK 2-A: Core Double-Entry Engine - Balanced Ledger Transaction
   */
  async executeLedgerTransaction(
    manager: EntityManager,
    referenceType: string,
    referenceId: string,
    description: string,
    entries: {
      walletId?: string;
      accountTag: 'EARNINGS' | 'CASH_IN_HAND' | 'PLATFORM_REV' | 'TAX_PAYABLE' | 'VOUCHER_EXP';
      direction: 'CREDIT' | 'DEBIT';
      amount: number;
      moduleType?: string;
      description?: string;
    }[]
  ) {
    const tx = manager.create(FinancialTransaction, {
      referenceType,
      referenceId,
      description,
    });
    const savedTx = await manager.save(tx);

    for (const data of entries) {
      const entry = manager.create(FinancialLedgerEntry, {
        ...data,
        transactionId: savedTx.id,
        amount: Number(data.amount),
      });
      await manager.save(entry);

      if (data.walletId) {
        const wallet = await manager.findOne(Wallet, {
          where: { id: data.walletId },
          lock: { mode: 'pessimistic_write' },
        });

        if (wallet) {
          const amount = Number(data.amount);
          if (data.accountTag === 'EARNINGS') {
            wallet.balance = data.direction === 'CREDIT' ? Number(wallet.balance) + amount : Number(wallet.balance) - amount;
          } else if (data.accountTag === 'CASH_IN_HAND') {
            wallet.cashInHand = data.direction === 'DEBIT' ? Number(wallet.cashInHand) + amount : Number(wallet.cashInHand) - amount;
          }
          await manager.save(wallet);
          
          if (wallet.userType === 'Rider') {
            await this.checkRiderThreshold(manager, wallet);
          }
        }
      }
    }
    return savedTx;
  }

  private async checkRiderThreshold(manager: EntityManager, wallet: Wallet) {
    const threshold = await this.settingsService.getNumber('rider_cod_threshold', 5000);
    
    if (Number(wallet.cashInHand) > threshold && !wallet.isSuspended) {
      this.logger.warn(`Rider ${wallet.userId} exceeded cash limit (${wallet.cashInHand}). Suspending.`);
      wallet.isSuspended = true;
      await manager.save(wallet);
    } else if (Number(wallet.cashInHand) <= threshold && wallet.isSuspended) {
      this.logger.log(`Rider ${wallet.userId} cleared debt. Activating.`);
      wallet.isSuspended = false;
      await manager.save(wallet);
    }
  }

  /**
   * UPGRADE 2: Automated Refund Engine (Reversal Engine)
   */
  async processOrderRefund(orderId: string, manager: EntityManager) {
    this.logger.log(`Initiating reversal engine for order: ${orderId}`);

    // 1. Find the original settlement transaction
    const originalTx = await manager.findOne(FinancialTransaction, {
      where: { referenceId: orderId, referenceType: 'ORDER_SETTLEMENT' },
      relations: ['entries'],
    });

    if (!originalTx) {
      this.logger.warn(`No original settlement found for order ${orderId}. Reversal skipped.`);
      return;
    }

    // 2. Generate contra-entries (Opposites)
    const contraEntries = originalTx.entries.map(entry => ({
      walletId: entry.walletId,
      accountTag: entry.accountTag as any,
      direction: entry.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT' as any,
      amount: Number(entry.amount),
      moduleType: entry.moduleType,
      description: `Contra-entry: Reversal of ${entry.accountTag} from order ${orderId.split('-')[0]}`,
    }));

    // 3. Execute balanced reversal transaction
    return this.executeLedgerTransaction(
      manager,
      'ORDER_REFUND',
      orderId,
      `Reversal of settlement for cancelled order #${orderId.split('-')[0].toUpperCase()}`,
      contraEntries
    );
  }

  private async ensureWallet(manager: EntityManager, userId: string, userType: 'Rider' | 'Vendor' | 'User'): Promise<Wallet> {
    let wallet = await manager.findOne(Wallet, { where: { userId, userType } });
    if (!wallet) {
      this.logger.log(`Creating missing wallet for ${userType} ID: ${userId}`);
      wallet = manager.create(Wallet, { userId, userType, balance: 0, cashInHand: 0 });
      wallet = await manager.save(wallet);
    }
    return wallet;
  }

  /**
   * TASK 2-C: Multi-Vendor App Split Engine
   */
  async processOrderSettlement(order: Order, manager: EntityManager) {
    const isCOD = order.paymentMethod?.toLowerCase() === 'cod' || order.paymentMethod?.toLowerCase() === 'cash_on_delivery';
    const riderId = order.riderId;
    const moduleType = order.orderType;

    const ledgerLines: any[] = [];
    const riderTakeHome = Number(order.deliveryFee) + (order.orderType === 'pharma' ? 50 : 0);

    let totalVendorPayout = 0;
    let totalPlatformCommission = 0;

    const stakeholders = order.subOrders && order.subOrders.length > 0 
      ? order.subOrders.map(s => ({ 
          id: s.vendorId || s.restaurantId || s.pharmacyId, 
          subtotal: Number(s.subtotal),
          type: (s.pharmacyId ? 'pharmacy' : s.restaurantId ? 'restaurant' : 'vendor') as any
        }))
      : [{ 
          id: order.restaurantId || order.pharmacyId || order.martId, 
          subtotal: Number(order.subtotal),
          type: (order.pharmacyId ? 'pharmacy' : order.restaurantId ? 'restaurant' : 'vendor') as any
        }];

    this.logger.log(`Processing settlement for Order #${order.id} (Rider: ${riderId}, Type: ${moduleType}, COD: ${isCOD})`);

    for (const sh of stakeholders) {
      if (!sh.id) continue;
      
      const config = await this.getCommissionRate(sh.type, sh.id, moduleType);
      const commission = this.calculateCommission(sh.subtotal, config);
      const vendorNet = sh.subtotal - commission;

      totalVendorPayout += vendorNet;
      totalPlatformCommission += commission;

      const vWallet = await this.ensureWallet(manager, sh.id, 'Vendor');
      ledgerLines.push({
        walletId: vWallet.id,
        accountTag: 'EARNINGS',
        direction: 'CREDIT',
        amount: vendorNet,
        moduleType,
        description: `Vendor Payout for #${order.id.split('-')[0].toUpperCase()} (${config.commissionPercent}% commute)`,
      });
    }

    ledgerLines.push({
      accountTag: 'PLATFORM_REV',
      direction: 'CREDIT',
      amount: totalPlatformCommission,
      moduleType,
      description: `Platform Commission from order #${order.id.split('-')[0].toUpperCase()}`,
    });

    if (riderId) {
      const rWallet = await this.ensureWallet(manager, riderId, 'Rider');
      ledgerLines.push({
        walletId: rWallet.id,
        accountTag: 'EARNINGS',
        direction: 'CREDIT',
        amount: riderTakeHome,
        description: `Rider Delivery Fee for #${order.id.split('-')[0].toUpperCase()}`,
      });

      if (isCOD) {
        ledgerLines.push({
          walletId: rWallet.id,
          accountTag: 'CASH_IN_HAND',
          direction: 'DEBIT',
          amount: Number(order.total),
          description: `COD Cash Collected from #${order.id.split('-')[0].toUpperCase()}`,
        });
      }
    }

    if (Number(order.discountAmount) > 0) {
      ledgerLines.push({
        accountTag: 'VOUCHER_EXP',
        direction: 'DEBIT',
        amount: Number(order.discountAmount),
        description: `Platform Coupon Expense for #${order.id.split('-')[0].toUpperCase()} (${order.couponCode})`,
      });
    }

    return this.executeLedgerTransaction(
      manager,
      'ORDER_SETTLEMENT',
      order.id,
      `Split engine distribution for order #${order.id.split('-')[0].toUpperCase()}`,
      ledgerLines
    );
  }

  async reconcileRiderCash(riderId: string, amount: number, referenceId: string, manager: EntityManager) {
    const wallet = await manager.findOne(Wallet, { where: { userId: riderId, userType: 'Rider' } });
    if (!wallet) throw new BadRequestException('Rider wallet not found');

    return this.executeLedgerTransaction(
      manager,
      'CASH_RECONCILIATION',
      referenceId,
      `Cash remittance from rider via external payment`,
      [
        {
          walletId: wallet.id,
          accountTag: 'CASH_IN_HAND',
          direction: 'CREDIT',
          amount: amount,
          description: `Rider remitted ${amount} cash to platform. Ref: ${referenceId}`,
        }
      ]
    );
  }

  async getCommissionRate(
    entityType: 'vendor' | 'restaurant' | 'pharmacy',
    entityId: string,
    moduleType: string,
  ): Promise<any> {
    const specific = await this.commissionRepo.findOne({
      where: { entityId, isActive: true, moduleType: moduleType as any },
      order: { createdAt: 'DESC' },
    });
    if (specific) return specific;

    const moduleDefault = await this.commissionRepo.findOne({
      where: { entityType, isActive: true, moduleType: moduleType as any },
      order: { createdAt: 'DESC' },
    });
    if (moduleDefault) return moduleDefault;

    return { commissionPercent: 10, minCommission: 0, maxCommission: 0 };
  }

  calculateCommission(amount: number, config: any): number {
    let comm = amount * (Number(config.commissionPercent) / 100);
    if (config.minCommission > 0) comm = Math.max(comm, Number(config.minCommission));
    if (config.maxCommission > 0) comm = Math.min(comm, Number(config.maxCommission));
    return Number(comm.toFixed(2));
  }

  // --- Snapshot & Reporting (Restored for Build Fix) ---

  async generateDailySnapshot(date: Date) {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const ledgerStats = await this.ledgerRepo.createQueryBuilder('entry')
      .where('entry.createdAt BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .select([
        'SUM(CASE WHEN entry.accountTag = \'PLATFORM_REV\' THEN entry.amount ELSE 0 END) as commissions',
        'SUM(CASE WHEN entry.accountTag = \'EARNINGS\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as payouts',
        'SUM(CASE WHEN entry.accountTag = \'CASH_IN_HAND\' AND entry.direction = \'DEBIT\' THEN entry.amount ELSE 0 END) as cod_collected',
        'SUM(CASE WHEN entry.moduleType = \'mart\' AND entry.accountTag = \'PLATFORM_REV\' THEN entry.amount ELSE 0 END) as mart_rev',
        'SUM(CASE WHEN (entry.moduleType = \'food\' OR entry.moduleType = \'restaurant\') AND entry.accountTag = \'PLATFORM_REV\' THEN entry.amount ELSE 0 END) as food_rev',
        'SUM(CASE WHEN entry.moduleType = \'pharma\' AND entry.accountTag = \'PLATFORM_REV\' THEN entry.amount ELSE 0 END) as pharma_rev',
        'SUM(CASE WHEN entry.moduleType = \'rashan\' AND entry.accountTag = \'PLATFORM_REV\' THEN entry.amount ELSE 0 END) as rashan_rev',
      ])
      .getRawOne();

    const orderStats = await this.txRepo.manager.getRepository(Order).createQueryBuilder('o')
      .where('o.createdAt BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .select([
        'COUNT(o.id) as total',
        'COUNT(CASE WHEN o.status = \'delivered\' THEN 1 END) as completed',
        'COUNT(CASE WHEN o.status = \'cancelled\' THEN 1 END) as cancelled',
        'SUM(o.total) as gross',
        'SUM(o.deliveryFee) as delivery',
        'SUM(o.discountAmount) as discounts',
      ])
      .getRawOne();

    const snapshot = this.snapshotRepo.create({
      snapshotDate: dayStart,
      userType: 'Platform',
      totalOrders: Number(orderStats.total || 0),
      completedOrders: Number(orderStats.completed || 0),
      cancelledOrders: Number(orderStats.cancelled || 0),
      grossRevenue: Number(orderStats.gross || 0),
      totalCommissions: Number(ledgerStats.commissions || 0),
      totalPayouts: Number(ledgerStats.payouts || 0),
      totalDeliveryFees: Number(orderStats.delivery || 0),
      totalDiscounts: Number(orderStats.discounts || 0),
      codCollected: Number(ledgerStats.cod_collected || 0),
      netRevenue: Number(ledgerStats.commissions || 0), // Profit = platform commissions
      martRevenue: Number(ledgerStats.mart_rev || 0),
      foodRevenue: Number(ledgerStats.food_rev || 0),
      pharmaRevenue: Number(ledgerStats.pharma_rev || 0),
      rashanRevenue: Number(ledgerStats.rashan_rev || 0),
    });

    return this.snapshotRepo.save(snapshot);
  }

  async getWalletStatement(walletId: string) {
    return this.ledgerRepo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
      relations: ['transaction'],
    });
  }

  async getFinancialLeaderboard(userType: 'Rider' | 'Vendor', limit = 5) {
    const query = this.walletRepo.createQueryBuilder('w')
      .where('w.userType = :userType', { userType });

    if (userType === 'Rider') {
      const { Rider } = await import('../riders/rider.entity'); // Dynamic import to avoid cycles if any
      query.leftJoinAndMapOne('w.profile', Rider, 'r', 'r.id = w.userId');
    } else {
      const { Vendor } = await import('../vendors/vendor.entity');
      query.leftJoinAndMapOne('w.profile', Vendor, 'v', 'v.id = w.userId');
    }

    const wallets = await query.orderBy('w.balance', 'DESC').take(limit).getMany();

    // Fetch real order counts for these entities
    const results = await Promise.all(wallets.map(async w => {
      const orderCount = await this.txRepo.manager.getRepository(Order).count({
        where: userType === 'Rider' ? { riderId: w.userId } : { martId: w.userId, status: 'delivered' }
      });

      return {
        walletId: w.id,
        entityName: (w as any).profile?.name || (userType === 'Rider' ? `Rider #${w.userId.slice(-4)}` : 'Unknown Merchant'),
        totalRevenue: Number(w.balance) + Number(w.cashInHand),
        totalOrders: orderCount,
      };
    }));

    return results;
  }

  async getPortfolioSummary(walletId?: string) {
    if (walletId) {
       const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
       return {
          netBalance: wallet?.balance || 0,
          cashOutstanding: wallet?.cashInHand || 0,
       };
    }
    
    // Global Summary
    const stats = await this.walletRepo.createQueryBuilder('w')
       .select([
          'SUM(w.balance) as total_earnings',
          'SUM(w.cash_in_hand) as total_cash',
          'COUNT(w.id) as total_wallets'
       ])
       .getRawOne();

    const platform = await this.ledgerRepo.createQueryBuilder('ledger')
       .where('ledger.accountTag = :tag', { tag: 'PLATFORM_REV' })
       .select('SUM(ledger.amount)', 'total')
       .getRawOne();

    const verticals = await this.ledgerRepo.createQueryBuilder('l')
       .where('l.accountTag = :tag', { tag: 'PLATFORM_REV' })
       .select('l.moduleType', 'module')
       .addSelect('SUM(l.amount)', 'total')
       .groupBy('l.moduleType')
       .getRawMany();

    const getV = (m: string) => {
       const match = verticals.find(v => v.module === m || (m === 'food' && v.module === 'restaurant'));
       return Number(match?.total || 0);
    };

    return {
       netBalance: Number(stats.total_earnings || 0),
       codOutstanding: Number(stats.total_cash || 0),
       totalCommissions: Number(platform.total || 0),
       totalEarnings: Number(stats.total_earnings || 0) + Number(stats.total_cash || 0),
       rashanEarnings: getV('rashan'),
       martEarnings: getV('mart'),
       foodEarnings: getV('food'), // getV handles 'restaurant' mapping
       pharmaEarnings: getV('pharma'),
       activeWallets: Number(stats.total_wallets || 0),
    };
  }
}
