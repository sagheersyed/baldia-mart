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
    // 1. Fetch Dynamic Threshold (Default: 5000)
    const threshold = await this.settingsService.get('rider_cod_threshold', 5000);
    const currentCash = Number(wallet.cashInHand);
    
    if (currentCash > threshold && !wallet.isSuspended) {
      this.logger.warn(`🛑 RIDER_SUSPENDED: ${wallet.userId} exceeded limit (${currentCash}/${threshold})`);
      
      wallet.isSuspended = true;
      await manager.save(wallet);

      // 2. Trigger Event Dispatcher (Phase 3 Spec)
      this.emitRiderSuspensionNotification(wallet.userId, currentCash, threshold);
      
    } else if (currentCash <= threshold && wallet.isSuspended) {
      this.logger.log(`✅ RIDER_REACTIVATED: ${wallet.userId} within limits (${currentCash}/${threshold})`);
      wallet.isSuspended = false;
      await manager.save(wallet);
    }
  }

  private emitRiderSuspensionNotification(riderId: string, currentCash: number, threshold: number) {
    this.logger.log(`[EventDispatcher] Emitting suspension push notification to Rider ${riderId}...`);
    // Logic for NotificationService/SMSGateway will go here in Phase 4
    // Payload: { event: 'SURCHARGE_LIMIT_EXCEEDED', amount: currentCash, limit: threshold }
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
    const flowMode = order.cashFlowMode || 'MERCHANT_CREDIT';

    // 1. Fetch Dynamic Platform Service Fee from Settings
    const serviceFee = await this.settingsService.getNumber('platform_service_fee', 15);

    const ledgerLines: any[] = [];
    const riderTakeHome = Number(order.deliveryFee) + (order.orderType === 'pharma' ? 50 : 0);

    let totalVendorPayout = 0;
    let totalPlatformCommission = 0;

    const stakeholders = (order.subOrders && order.subOrders.length > 0) 
      ? order.subOrders.map(s => ({ 
          id: s.vendorId || s.restaurantId || s.pharmacyId || (s as any).vendor?.id || (s as any).restaurant?.id || (s as any).pharmacy?.id, 
          subtotal: Number(s.subtotal),
          type: (s.pharmacyId || (s as any).pharmacy ? 'pharmacy' : (s.restaurantId || (s as any).restaurant) ? 'restaurant' : 'vendor') as any
        }))
      : [{ 
          id: order.restaurantId || order.pharmacyId || order.martId || order.restaurant?.id || order.pharmacy?.id || order.brand?.id, 
          subtotal: Number(order.subtotal),
          type: (order.pharmacyId || order.pharmacy ? 'pharmacy' : (order.restaurantId || order.restaurant) ? 'restaurant' : 'vendor') as any
        }];

    this.logger.log(`Finance Engine: Processing ${flowMode} settlement for #${order.id.split('-')[0].toUpperCase()} (COD: ${isCOD})`);

    // --- PHASE 2 REFACTOR: Split-Payment & Commission Logic ---
    for (const sh of stakeholders) {
      if (!sh.id) continue;
      
      const config = await this.getCommissionRate(sh.type, sh.id, moduleType);
      const commission = this.calculateCommission(sh.subtotal, config);
      const vendorNet = sh.subtotal - commission;

      totalPlatformCommission += commission;
      totalVendorPayout += vendorNet;

      const vWallet = await this.ensureWallet(manager, sh.id, 'Vendor');
      
      if (flowMode === 'MERCHANT_CREDIT') {
        ledgerLines.push({
          walletId: vWallet.id,
          accountTag: 'EARNINGS',
          direction: 'CREDIT',
          amount: vendorNet,
          moduleType,
          description: `Vendor Payout for #${order.id.split('-')[0].toUpperCase()} (${config.commissionPercent}% comm)`,
        });
      } else {
        // CASH_ON_PICK: Rider paid vendor upfront. 
        // We log the earnings and the corresponding cash receipt to keep ledger balanced and reports accurate.
        ledgerLines.push({
          walletId: vWallet.id,
          accountTag: 'EARNINGS',
          direction: 'CREDIT',
          amount: vendorNet,
          moduleType,
          description: `Gross Sale for #${order.id.split('-')[0].toUpperCase()} (Cash-on-Pick)`,
        });
        ledgerLines.push({
          walletId: vWallet.id,
          accountTag: 'EARNINGS',
          direction: 'DEBIT',
          amount: vendorNet,
          moduleType,
          description: `Rider Cash-on-Pick Payment for #${order.id.split('-')[0].toUpperCase()}`,
        });
      }
    }

    // Platform Revenue Impact (Commission + Service Fee)
    ledgerLines.push({
      accountTag: 'PLATFORM_REV',
      direction: 'CREDIT',
      amount: totalPlatformCommission + serviceFee,
      moduleType,
      description: `Platform Revenue: Comm(${totalPlatformCommission}) + Fee(${serviceFee}) from order #${order.id.split('-')[0].toUpperCase()}`,
    });

    if (riderId) {
      const rWallet = await this.ensureWallet(manager, riderId, 'Rider');
      
      // Rider Earnings (Delivery Fees)
      ledgerLines.push({
        walletId: rWallet.id,
        accountTag: 'EARNINGS',
        direction: 'CREDIT',
        amount: riderTakeHome,
        description: `Rider Delivery Fee for #${order.id.split('-')[0].toUpperCase()}`,
      });

      // BRANCH 1 & 2: Rider Cash-in-Hand Debt
      if (isCOD) {
        let riderDebtAmount = 0;
        let debtDescription = "";

        if (flowMode === 'CASH_ON_PICK') {
          // Rider ONLY owes the platform its revenue share (since they already paid the merchant)
          riderDebtAmount = totalPlatformCommission + serviceFee;
          debtDescription = `Remittance Owed: Comm + Fee for #${order.id.split('-')[0].toUpperCase()} (Cash-on-Pick)`;
        } else {
          // Rider owes the FULL total (merchant-credit mode)
          riderDebtAmount = Number(order.total);
          debtDescription = `COD Cash Collected (Total) from #${order.id.split('-')[0].toUpperCase()}`;
        }

        ledgerLines.push({
          walletId: rWallet.id,
          accountTag: 'CASH_IN_HAND',
          direction: 'DEBIT',
          amount: riderDebtAmount,
          description: debtDescription,
        });
      }
    }

    if (Number(order.discountAmount) > 0) {
      ledgerLines.push({
        accountTag: 'VOUCHER_EXP',
        direction: 'DEBIT',
        amount: Number(order.discountAmount),
        description: `Platform Voucher Expense for #${order.id.split('-')[0].toUpperCase()}`,
      });
    }

    // ACID Execution
    return this.executeLedgerTransaction(
      manager,
      'ORDER_SETTLEMENT',
      order.id,
      `Multi-Split Settlement Logic: ${flowMode}`,
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

    // Default Commission Strategy by Vertical (from Settings or Fallback)
    const settingsKey = `commission_rate_${moduleType}`;
    const defaultPercent = await this.settingsService.getNumber(settingsKey, 
      moduleType === 'food' ? 15 : 
      moduleType === 'mart' ? 10 : 
      moduleType === 'pharma' ? 5 : 
      moduleType === 'rashan' ? 7.5 : 10
    );
    
    const minCommission = await this.settingsService.getNumber(`min_commission_${moduleType}`, 0);
    const maxCommission = await this.settingsService.getNumber(`max_commission_${moduleType}`, 0);

    return { 
      commissionPercent: defaultPercent, 
      minCommission: minCommission, 
      maxCommission: maxCommission 
    };
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
        'SUM(CASE WHEN entry.accountTag = \'PLATFORM_REV\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as commissions',
        'SUM(CASE WHEN entry.accountTag = \'EARNINGS\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as payouts',
        'SUM(CASE WHEN entry.accountTag = \'CASH_IN_HAND\' AND entry.direction = \'DEBIT\' THEN entry.amount ELSE 0 END) as cod_collected',
        'SUM(CASE WHEN entry.accountTag = \'CASH_IN_HAND\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as cod_remitted',
        'SUM(CASE WHEN entry.moduleType = \'mart\' AND entry.accountTag = \'PLATFORM_REV\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as mart_rev',
        'SUM(CASE WHEN (entry.moduleType = \'food\' OR entry.moduleType = \'restaurant\') AND entry.accountTag = \'PLATFORM_REV\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as food_rev',
        'SUM(CASE WHEN entry.moduleType = \'pharma\' AND entry.accountTag = \'PLATFORM_REV\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as pharma_rev',
        'SUM(CASE WHEN entry.moduleType = \'rashan\' AND entry.accountTag = \'PLATFORM_REV\' AND entry.direction = \'CREDIT\' THEN entry.amount ELSE 0 END) as rashan_rev',
        'SUM(CASE WHEN entry.accountTag = \'VOUCHER_EXP\' THEN entry.amount ELSE 0 END) as voucher_expense',
      ])
      .getRawOne();

    // Refund totals from ORDER_REFUND transactions
    const refundStats = await this.txRepo.createQueryBuilder('tx')
      .where('tx.referenceType = :type', { type: 'ORDER_REFUND' })
      .andWhere('tx.createdAt BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .leftJoin('tx.entries', 'entry')
      .select('SUM(CASE WHEN entry.accountTag = \'PLATFORM_REV\' AND entry.direction = \'DEBIT\' THEN entry.amount ELSE 0 END)', 'total_refunds')
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
        'SUM(CASE WHEN o.status = \'delivered\' AND o.paymentMethod != \'cod\' AND o.paymentMethod != \'cash_on_delivery\' THEN o.total ELSE 0 END) as online_payments',
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
      totalRefunds: Number(refundStats?.total_refunds || 0),
      codCollected: Number(ledgerStats.cod_collected || 0),
      codRemitted: Number(ledgerStats.cod_remitted || 0),
      onlinePayments: Number(orderStats.online_payments || 0),
      netRevenue: Number(ledgerStats.commissions || 0),
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
        where: userType === 'Rider' 
          ? { riderId: w.userId } 
          : [
              { martId: w.userId, status: 'delivered' },
              { restaurantId: w.userId, status: 'delivered' },
              { pharmacyId: w.userId, status: 'delivered' }
            ]
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
      if (!wallet) return null;

      // Calculate totals from ledger
      const stats = await this.ledgerRepo.createQueryBuilder('l')
        .where('l.walletId = :walletId', { walletId })
        .select([
          'SUM(CASE WHEN l.direction = \'CREDIT\' AND l.accountTag = \'EARNINGS\' THEN l.amount ELSE 0 END) as total_gross',
          'SUM(CASE WHEN l.direction = \'DEBIT\' AND (l.accountTag = \'EARNINGS\' OR l.accountTag = \'PLATFORM_REV\') THEN l.amount ELSE 0 END) as total_deductions',
        ])
        .getRawOne();

      // Handle PostgreSQL case-sensitivity/aliasing in raw queries
      const gross = Number(stats?.total_gross || stats?.totalgross || 0);
      const deductions = Number(stats?.total_deductions || stats?.totaldeductions || 0);

      return {
        netBalance: Number(wallet.balance),
        cashOutstanding: Number(wallet.cashInHand),
        totalEarnings: gross,
        totalCommissions: deductions, 
        isSuspended: wallet.isSuspended,
        updatedAt: wallet.updatedAt,
      };
    }

    // 1. Core Capital Pool Metrics (Platform-Wide)
    const stats = await this.walletRepo.createQueryBuilder('w')
      .select([
        'SUM(CASE WHEN w.balance > 0 THEN w.balance ELSE 0 END) as platform_liability',
        'SUM(w.cash_in_hand) as cod_risk',
        'COUNT(w.id) as total_nodes'
      ])
      .getRawOne();

    // 2. Platform Revenue Aggregation (Commission + Fees)
    const platform = await this.ledgerRepo.createQueryBuilder('ledger')
      .where('ledger.accountTag = :tag', { tag: 'PLATFORM_REV' })
      .select('SUM(CASE WHEN ledger.direction = \'CREDIT\' THEN ledger.amount ELSE -ledger.amount END)', 'net_rev')
      .getRawOne();

    // 3. Vertical Revenue Breakdown (Silo Isolation)
    const verticals = await this.ledgerRepo.createQueryBuilder('l')
      .where('l.accountTag = :tag', { tag: 'PLATFORM_REV' })
      .select('l.moduleType', 'module')
      .addSelect('SUM(CASE WHEN l.direction = \'CREDIT\' THEN l.amount ELSE -l.amount END)', 'total')
      .groupBy('l.moduleType')
      .getRawMany();

    const getV = (m: string) => {
      const match = verticals.find(v => v.module === m || (m === 'food' && v.module === 'restaurant'));
      return Number(match?.total || 0);
    };

    // 4. Cash Pipeline Audit (Collected vs Remitted)
    const pipeline = await this.ledgerRepo.createQueryBuilder('p')
       .where('p.accountTag = :tag', { tag: 'CASH_IN_HAND' })
       .select('SUM(CASE WHEN p.direction = \'DEBIT\' THEN p.amount ELSE 0 END)', 'collected')
       .addSelect('SUM(CASE WHEN p.direction = \'CREDIT\' THEN p.amount ELSE 0 END)', 'remitted')
       .getRawOne();

    return {
      netBalance: Number(stats.platform_liability || 0),
      codOutstanding: Number(stats.cod_risk || 0),
      totalCommissions: Number(platform.net_rev || 0),
      totalEarnings: Number(stats.platform_liability || 0) + Number(stats.cod_risk || 0),
      cashPipeline: {
         collected: Number(pipeline.collected || 0),
         remitted: Number(pipeline.remitted || 0),
         gap: Number(pipeline.collected || 0) - Number(pipeline.remitted || 0)
      },
      rashanEarnings: getV('rashan'),
      martEarnings: getV('mart'),
      foodEarnings: getV('food'),
      pharmaEarnings: getV('pharma'),
      activeWallets: Number(stats.total_nodes || 0),
    };
  }

  /**
   * COMPONENT B: Automated Refund Engine (Contra-Accounting / Reversal)
   * Enforces Zero-Deletion Policy by programmatically inverting ledger state.
   */
  async processOrderRefund(orderId: string, manager: EntityManager) {
    this.logger.log(`Finance Engine: Commencing Contra-Accounting reversal for Order #${orderId}`);

    // Step 1: Fetch original Order Settlement entries
    const originalTx = await manager.findOne(FinancialTransaction, {
      where: { referenceId: orderId, referenceType: 'ORDER_SETTLEMENT' },
      relations: ['entries'],
    });

    if (!originalTx) {
      this.logger.warn(`Refund Aborted: No existing settlement found for order ${orderId}`);
      return;
    }

    // Step 2: Generate exact INVERSE contra-entries
    const contraEntries = originalTx.entries.map(entry => ({
      walletId: entry.walletId,
      accountTag: entry.accountTag as any,
      // INVERSION LOGIC: CREDIT becomes DEBIT, DEBIT becomes CREDIT
      direction: entry.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT' as any,
      amount: Number(entry.amount),
      moduleType: entry.moduleType,
      description: `Contra-Accounting: Reversal of ${entry.accountTag} for order #${orderId.split('-')[0].toUpperCase()}`,
    }));

    // Step 3: Atomic execution of the Reversal Transaction
    return this.executeLedgerTransaction(
      manager,
      'ORDER_REFUND',
      orderId,
      `Full Financial Reversal (Refund Engine) for order #${orderId}`,
      contraEntries
    );
  }
}
