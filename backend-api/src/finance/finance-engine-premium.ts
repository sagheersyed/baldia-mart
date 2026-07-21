import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
  CanActivate,
  ExecutionContext,
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InjectRepository, InjectConnection } from '@nestjs/typeorm';
import { Repository, EntityManager, Connection } from 'typeorm';
import { Order } from '../orders/order.entity';
import { SubOrder } from '../orders/sub-order.entity';
import { Coupon, DiscountType } from '../coupons/coupon.entity';
import { Wallet } from '../wallets/wallet.entity';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

// ═══════════════════════════════════════════════════════════════
// 1. EXTENDED DATABASE SCHEMAS DEFINITION
// ═══════════════════════════════════════════════════════════════

/**
 * Entity 2: Premium Financial Ledger Entry (financial_ledger_entries)
 * Stores granular debit/credit entries for balancing dual ledger movements.
 */
@Entity('financial_ledger_entries_premium')
@Index('IDX_LEDGER_PREM_TX', ['transactionId'])
@Index('IDX_LEDGER_PREM_ORDER', ['orderId'])
@Index('IDX_LEDGER_PREM_TAG', ['accountTag'])
@Index('IDX_LEDGER_PREM_DATE', ['createdAt'])
export class PremiumFinancialLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId: string;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({
    name: 'account_tag',
    type: 'enum',
    enum: [
      'USER_WALLETS',
      'VENDOR_WALLETS',
      'RIDER_EARNINGS',
      'CASH_IN_HAND',
      'PLATFORM_REV',
      'MARKETPLACE_LIABILITY',
    ],
  })
  accountTag: string;

  @Column({ type: 'enum', enum: ['DEBIT', 'CREDIT'] })
  direction: 'DEBIT' | 'CREDIT';

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'module_type', type: 'enum', enum: ['mart', 'food', 'pharma', 'rashan'] })
  moduleType: string;

  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: ['ORDER_DELIVERY', 'ORDER_REFUND', 'CASH_RECONCILIATION', 'PLATFORM_PAYOUT'],
  })
  referenceType: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/**
 * Entity 3: Premium Commission Configuration (commission_configs)
 * Cascading settings resolutions.
 */
@Entity('commission_configs_premium')
@Index('IDX_COMM_PREM_VENDOR', ['vendorId', 'moduleType'])
export class PremiumCommissionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string;

  @Column({ name: 'module_type', type: 'enum', enum: ['mart', 'food', 'pharma', 'rashan'] })
  moduleType: string;

  @Column('decimal', { name: 'commission_percentage', precision: 5, scale: 2 })
  commissionPercentage: number;

  @Column('decimal', { name: 'min_commission', precision: 10, scale: 2, default: 0.0 })
  minCommission: number;

  @Column('decimal', { name: 'max_commission', precision: 10, scale: 2, default: 0.0 })
  maxCommission: number;
}

// ═══════════════════════════════════════════════════════════════
// 2. EXCEPTION AND GUARDS lifecycles
// ═══════════════════════════════════════════════════════════════

/**
 * Pipeline D Interception Exception Overlay
 */
export class RiderSuspendedException extends HttpException {
  constructor(message = 'Delivery request rejected. Rider is suspended due to COD balance threshold violation.') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message,
        code: 'RIDER_SUSPENDED',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Guard preventing rider actions if wallet is suspended.
 */
@Injectable()
export class RiderSuspensionGuard implements CanActivate {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.role !== 'Rider') {
      return true;
    }

    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id, userType: 'Rider' },
    });

    if (wallet && wallet.isSuspended) {
      throw new RiderSuspendedException();
    }
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. CORE FinanceManagementService
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class FinanceManagementService {
  private readonly logger = new Logger(FinanceManagementService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(PremiumFinancialLedgerEntry)
    private readonly ledgerRepo: Repository<PremiumFinancialLedgerEntry>,
    @InjectRepository(PremiumCommissionConfig)
    private readonly commissionRepo: Repository<PremiumCommissionConfig>,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * System Boot Re-Validation Hook
   * Scans core ledger table consistency to find errors.
   */
  async onModuleInit() {
    this.logger.log('Starting system audit re-validation verification checks...');
    try {
      await this.connection.transaction(async (manager) => {
        const wallets = await manager.find(Wallet);
        for (const wallet of wallets) {
          const ledgerSum = await manager
            .createQueryBuilder(PremiumFinancialLedgerEntry, 'entry')
            .where('entry.walletId = :walletId', { walletId: wallet.id })
            .select([
              `SUM(CASE WHEN entry.direction = 'CREDIT' THEN entry.amount ELSE -entry.amount END) as current_bal`,
            ])
            .getRawOne();

          const expectedBalance = Number(ledgerSum?.current_bal || 0);
          if (Math.abs(Number(wallet.balance) - expectedBalance) > 0.01) {
            this.logger.warn(
              `Healed balance mismatch for wallet ${wallet.id}. DB: ${wallet.balance}, Ledger: ${expectedBalance}`,
            );
            wallet.balance = expectedBalance;
            await manager.save(wallet);
          }
        }
      });
      this.logger.log('Audit check complete.');
    } catch (err) {
      this.logger.error('Startup validation failed:', err);
    }
  }

  /**
   * Pipeline A: Checkout Price Matrix Calculator
   * Strictly calculates payable amounts based on catalog database values and limits.
   */
  async calculateCheckoutPrice(cartData: {
    userId: string;
    items: { type: 'mart' | 'food' | 'pharma' | 'rashan'; id: string; quantity: number }[];
    deliveryFee: number;
    couponCode?: string;
    applyWalletPoints: number;
  }) {
    // 1. Compute Subtotal dynamically from database catalog and discard raw body values
    let subtotal = 0;
    for (const item of cartData.items) {
      let price = 0;
      if (item.type === 'mart') {
        const prod = await this.connection.manager.findOne('Product', { where: { id: item.id } });
        price = prod ? Number((prod as any).price) : 0;
      } else if (item.type === 'food') {
        const menuItem = await this.connection.manager.findOne('MenuItem', { where: { id: item.id } });
        price = menuItem ? Number((menuItem as any).price) : 0;
      } else if (item.type === 'pharma') {
        const med = await this.connection.manager.findOne('Medicine', { where: { id: item.id } });
        price = med ? Number((med as any).price) : 0;
      } else if (item.type === 'rashan') {
        const prod = await this.connection.manager.findOne('Product', { where: { id: item.id } });
        price = prod ? Number((prod as any).price) : 0;
      }
      subtotal += price * item.quantity;
    }

    // 2. Platform Service Fee baseline configuration lookup (default Rs. 15)
    const platformServiceFee = await this.settingsService.getNumber('platform_service_fee', 15);

    // 3. Coupon State Machine validation
    let discountAmount = 0;
    if (cartData.couponCode) {
      const coupon = await this.validateCoupon(cartData.couponCode, subtotal, cartData.userId);
      if (coupon.discount_type === DiscountType.PERCENTAGE) {
        let pctDiscount = subtotal * (Number(coupon.discount_value) / 100);
        if (coupon.max_discount_amount && pctDiscount > Number(coupon.max_discount_amount)) {
          pctDiscount = Number(coupon.max_discount_amount);
        }
        discountAmount = pctDiscount;
      } else {
        discountAmount = Math.min(Number(coupon.discount_value), subtotal);
      }
    }

    // 4. Wallet Reduction Guard limits verification
    const userWallet = await this.walletRepo.findOne({
      where: { userId: cartData.userId, userType: 'User' },
    });
    const maxWalletAvailable = userWallet ? Number(userWallet.balance) : 0;
    const subtotalAfterCoupon = Math.max(0, subtotal - discountAmount);

    const walletCreditApplied = Math.min(
      cartData.applyWalletPoints || 0,
      maxWalletAvailable,
      subtotalAfterCoupon + cartData.deliveryFee + platformServiceFee,
    );

    const finalPayable = subtotal + cartData.deliveryFee + platformServiceFee - discountAmount - walletCreditApplied;

    return {
      subtotal,
      deliveryFee: cartData.deliveryFee,
      platformServiceFee,
      discountAmount,
      walletCreditApplied,
      finalPayable: Number(finalPayable.toFixed(2)),
    };
  }

  /**
   * Pipeline B: Coupon Validation State Machine Engine
   */
  async validateCoupon(couponCode: string, subtotal: number, userId: string): Promise<Coupon> {
    const coupon = await this.connection.manager.findOne(Coupon, { where: { code: couponCode } });
    if (!coupon) {
      throw new BadRequestException('Coupon does not exist');
    }
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive');
    }

    const now = new Date();
    if (now < new Date(coupon.start_date) || now > new Date(coupon.end_date)) {
      throw new BadRequestException('Coupon has expired');
    }

    if (subtotal < Number(coupon.min_order_value)) {
      throw new BadRequestException(`Subtotal must be at least Rs. ${coupon.min_order_value}`);
    }

    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
      throw new BadRequestException('Coupon global usage limit reached');
    }

    const userCount = await this.connection.manager.count(Order, {
      where: { userId, couponCode, status: 'delivered' },
    });
    if (userCount >= coupon.user_limit) {
      throw new BadRequestException('User usage limit exceeded');
    }

    return coupon;
  }

  /**
   * Pipeline C: Order Delivery Flow Settle Engine
   * Multi-Vendor split-accounting execution logic with Option matrices and Pessimistic Write locks.
   */
  async processOrderSettlement(orderId: string) {
    return this.connection.transaction(async (manager) => {
      // 1. Fetch Order data safely
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['subOrders'],
      });
      if (!order) throw new BadRequestException('Order context not found');
      if (order.status !== 'delivered') throw new BadRequestException('Order is not yet delivered');

      const isCOD = order.paymentMethod?.toLowerCase() === 'cod' || order.paymentMethod?.toLowerCase() === 'cash_on_delivery';
      const riderId = order.riderId;
      const moduleType = order.orderType as any;
      const flowMode = order.cashFlowMode || 'CASH_ON_PICK';

      // Guard: CASH_ON_PICK orders require rider pickup payment confirmation before settlement
      if (flowMode === 'CASH_ON_PICK') {
        const subOrders = order.subOrders?.length
          ? order.subOrders
          : await manager.getRepository(SubOrder).find({ where: { orderId: order.id } });

        if (subOrders.length > 0) {
          const unconfirmed = subOrders.filter(s => s.pickupPaymentStatus !== 'confirmed');
          if (unconfirmed.length > 0) {
            throw new BadRequestException(
              `Settlement blocked: ${unconfirmed.length} shop payment(s) not confirmed for order #${order.id.slice(-6).toUpperCase()}`
            );
          }
        } else if (order.pickupPaymentStatus !== 'confirmed') {
          throw new BadRequestException(
            `Settlement blocked: shop payment not confirmed for order #${order.id.slice(-6).toUpperCase()}`
          );
        }
      }

      const serviceFee = await this.settingsService.getNumber('platform_service_fee', 15);
      const transactionGroupId = this.connection.manager.create(PremiumFinancialLedgerEntry).id; // Use generated UUID as parent log

      const coldChainBonus = (order.orderType === 'pharma' && order.isColdChain) ? 50 : 0;
      const riderTakeHome = Number(order.deliveryFee) + coldChainBonus;

      let totalAdminCommission = 0;
      let totalVendorShare = 0;

      const ledgerEntries: any[] = [];

      // Determine stakeholders
      const segments = order.subOrders && order.subOrders.length > 0
        ? order.subOrders.map(s => ({
            id: s.vendorId || s.restaurantId || s.pharmacyId,
            subtotal: Number(s.subtotal),
          }))
        : [{
            id: order.restaurantId || order.pharmacyId || order.martId,
            subtotal: Number(order.subtotal),
          }];

      // Iterate vendors split payouts
      for (const seg of segments) {
        if (!seg.id) continue;

        // Resolve cascading commission rate configuration
        const config = await this.resolveCommissionRate(seg.id, order.orderType);
        let comm = seg.subtotal * (Number(config.commissionPercentage) / 100);
        if (config.minCommission > 0) comm = Math.max(comm, Number(config.minCommission));
        if (config.maxCommission > 0) comm = Math.min(comm, Number(config.maxCommission));

        const vendorShare = seg.subtotal - comm;
        totalAdminCommission += comm;
        totalVendorShare += vendorShare;

        // Ensure wallet exists & grab pessimistic write lock
        const vWallet = await this.grabWallet(seg.id, 'Vendor', manager);

        // Core option rules splitting
        if (flowMode === 'MERCHANT_CREDIT') {
          // Option 3: Vendor Wallet credited with earnings net commission
          ledgerEntries.push({
            walletId: vWallet.id,
            accountTag: 'VENDOR_WALLETS',
            direction: 'CREDIT',
            amount: vendorShare,
            moduleType,
            description: `Store payout for Order #${order.id.slice(-6).toUpperCase()} net of commission`,
          });
        } else if (flowMode === 'CASH_ON_PICK') {
          // Rider paid merchant at pickup — track commission owed to platform only
          if (comm > 0) {
            ledgerEntries.push({
              walletId: vWallet.id,
              accountTag: 'COMMISSION_PAYABLE',
              direction: 'DEBIT',
              amount: comm,
              moduleType,
              description: `Platform commission due (Cash-on-Pick) for Order #${order.id.slice(-6).toUpperCase()}`,
            });
          }
        }
      }

      // Option 1 or standard prepaid flow vs cash flows platforms impact
      ledgerEntries.push({
        accountTag: 'PLATFORM_REV',
        direction: 'CREDIT',
        amount: totalAdminCommission + serviceFee,
        moduleType,
        description: `Platform fee + commission share on Order #${order.id.slice(-6).toUpperCase()}`,
      });

      // Rider ledger updates
      if (riderId) {
        const rWallet = await this.grabWallet(riderId, 'Rider', manager);
        
        // Earnings entry
        ledgerEntries.push({
          walletId: rWallet.id,
          accountTag: 'RIDER_EARNINGS',
          direction: 'CREDIT',
          amount: riderTakeHome,
          moduleType,
          description: `Rider payout: delivery fee + cold chain pharma bonus`,
        });

        // Cash flow options for cash in hand COD values
        if (isCOD) {
          if (flowMode === 'CASH_ON_PICK') {
            const platformShare = totalAdminCommission + serviceFee;

            ledgerEntries.push({
              walletId: rWallet.id,
              accountTag: 'CASH_IN_HAND',
              direction: 'DEBIT',
              amount: platformShare,
              moduleType,
              description: `Remittance Owed: Platform Share for Order #${order.id.slice(-6).toUpperCase()} (Cash-on-Pick)`,
            });

            // Auto-balancing: net rider liability to platform share only
            ledgerEntries.push({
              walletId: rWallet.id,
              accountTag: 'RIDER_EARNINGS',
              direction: 'DEBIT',
              amount: platformShare,
              moduleType,
              description: `Auto-Balancing: Platform share settled from earnings for Order #${order.id.slice(-6).toUpperCase()} (Cash-on-Pick)`,
            });

            ledgerEntries.push({
              walletId: rWallet.id,
              accountTag: 'CASH_IN_HAND',
              direction: 'CREDIT',
              amount: platformShare,
              moduleType,
              description: `Auto-Balancing: Cash-in-hand liability adjusted for Order #${order.id.slice(-6).toUpperCase()} (Cash-on-Pick)`,
            });
          } else {
            // Merchant credit flow: rider collects 100% of order totals
            ledgerEntries.push({
              walletId: rWallet.id,
              accountTag: 'CASH_IN_HAND',
              direction: 'DEBIT',
              amount: Number(order.total),
              moduleType,
              description: `Rider cash collection liability on Order #${order.id.slice(-6).toUpperCase()}`,
            });
          }
        }
      }

      // Perform immutable ledger write and mutate user wallets balances
      for (const line of ledgerEntries) {
        const entry = manager.create(PremiumFinancialLedgerEntry, {
          transactionId: transactionGroupId,
          orderId: order.id,
          accountTag: line.accountTag,
          direction: line.direction,
          amount: line.amount,
          moduleType: line.moduleType || 'mart',
          referenceType: 'ORDER_DELIVERY',
          metadata: { flowMode, isCOD },
        });
        await manager.save(entry);

        if (line.walletId) {
          const w = await manager.findOne(Wallet, {
            where: { id: line.walletId },
            lock: { mode: 'pessimistic_write' },
          });
          if (w) {
            const amountVal = Number(line.amount);
            if (line.accountTag === 'VENDOR_WALLETS' || line.accountTag === 'RIDER_EARNINGS' || line.accountTag === 'USER_WALLETS') {
              w.balance = line.direction === 'CREDIT' ? Number(w.balance) + amountVal : Number(w.balance) - amountVal;
            } else if (line.accountTag === 'CASH_IN_HAND') {
              w.cashInHand = line.direction === 'DEBIT' ? Number(w.cashInHand) + amountVal : Number(w.cashInHand) - amountVal;
            }
            await manager.save(w);

            // Execute dynamic suspension limit checks inside transaction block
            if (w.userType === 'Rider') {
              await this.evaluateSuspensionRules(w, manager);
            }
          }
        }
      }
    });
  }

  /**
   * Pipeline E: Reversal Engine
   */
  async processOrderRefund(orderId: string) {
    return this.connection.transaction(async (manager) => {
      const originalLines = await manager.find(PremiumFinancialLedgerEntry, {
        where: { orderId, referenceType: 'ORDER_DELIVERY' },
      });
      if (originalLines.length === 0) {
        throw new BadRequestException('No successful deliveries matching order context');
      }

      const reversalId = this.connection.manager.create(PremiumFinancialLedgerEntry).id;

      for (const line of originalLines) {
        const inverseDirection = line.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
        const contra = manager.create(PremiumFinancialLedgerEntry, {
          transactionId: reversalId,
          orderId: line.orderId,
          accountTag: line.accountTag,
          direction: inverseDirection,
          amount: Number(line.amount),
          moduleType: line.moduleType,
          referenceType: 'ORDER_REFUND',
          metadata: { invertedTransaction: line.transactionId },
        });
        await manager.save(contra);

        if (line.walletId) {
          const w = await manager.findOne(Wallet, {
            where: { id: line.walletId },
            lock: { mode: 'pessimistic_write' },
          });
          if (w) {
            const val = Number(line.amount);
            if (line.accountTag === 'VENDOR_WALLETS' || line.accountTag === 'RIDER_EARNINGS' || line.accountTag === 'USER_WALLETS') {
              w.balance = inverseDirection === 'CREDIT' ? Number(w.balance) + val : Number(w.balance) - val;
            } else if (line.accountTag === 'CASH_IN_HAND') {
              w.cashInHand = inverseDirection === 'DEBIT' ? Number(w.cashInHand) + val : Number(w.cashInHand) - val;
            }
            await manager.save(w);

            if (w.userType === 'Rider') {
              await this.evaluateSuspensionRules(w, manager);
            }
          }
        }
      }
    });
  }

  /**
   * Cash Reconciliation endpoint callback utility
   */
  async reconcileRiderCash(riderId: string, amount: number, referenceId: string) {
    return this.connection.transaction(async (manager) => {
      const wallet = await this.grabWallet(riderId, 'Rider', manager);
      const paymentTxId = this.connection.manager.create(PremiumFinancialLedgerEntry).id;

      const ledger = manager.create(PremiumFinancialLedgerEntry, {
        transactionId: paymentTxId,
        accountTag: 'CASH_IN_HAND',
        direction: 'CREDIT',
        amount,
        moduleType: 'mart',
        referenceType: 'CASH_RECONCILIATION',
        metadata: { referenceId },
      });
      await manager.save(ledger);

      wallet.cashInHand = Number(wallet.cashInHand) - amount;
      await manager.save(wallet);

      await this.evaluateSuspensionRules(wallet, manager);
      return { success: true, newCashInHand: wallet.cashInHand, isSuspended: wallet.isSuspended };
    });
  }

  // --- Helper Operations ---

  private async grabWallet(userId: string, userType: 'User' | 'Vendor' | 'Rider' | 'Platform', manager: EntityManager): Promise<Wallet> {
    let wallet = await manager.findOne(Wallet, {
      where: { userId, userType: userType === 'Platform' ? 'System' : userType },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      wallet = manager.create(Wallet, {
        userId,
        userType: userType === 'Platform' ? 'System' : userType,
        balance: 0,
        cashInHand: 0,
        isSuspended: false,
      });
      wallet = await manager.save(wallet);
    }
    return wallet;
  }

  private async evaluateSuspensionRules(wallet: Wallet, manager: EntityManager) {
    const threshold = await this.settingsService.getNumber('rider_cod_threshold', 5000);
    const inHand = Number(wallet.cashInHand);
    if (inHand > threshold && !wallet.isSuspended) {
      wallet.isSuspended = true;
      await manager.save(wallet);
      this.logger.warn(`Suspended Rider profile ${wallet.userId} - limit crossed: Rs. ${inHand}`);
    } else if (inHand <= threshold && wallet.isSuspended) {
      wallet.isSuspended = false;
      await manager.save(wallet);
      this.logger.log(`Restored Rider profileStatus ${wallet.userId} - restored below threshold.`);
    }
  }

  private async resolveCommissionRate(
    vendorId: string,
    moduleType: string,
  ): Promise<{ commissionPercentage: number; minCommission: number; maxCommission: number }> {
    const custom = await this.commissionRepo.findOne({
      where: { vendorId, moduleType: moduleType as any },
    });
    if (custom) return custom;

    const fallbackRate = await this.settingsService.getNumber(`commission_rate_${moduleType}`, 10);
    const minCommission = await this.settingsService.getNumber(`min_commission_${moduleType}`, 0);
    const maxCommission = await this.settingsService.getNumber(`max_commission_${moduleType}`, 0);

    return {
      commissionPercentage: fallbackRate,
      minCommission,
      maxCommission,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. TELEMETRY & REPORTING CONTROLLER LAYER
// ═══════════════════════════════════════════════════════════════

@Controller('finance-premium')
@UseGuards(JwtAuthGuard)
export class FinancePremiumController {
  constructor(
    private readonly service: FinanceManagementService,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  @Post('checkout/calculate')
  async checkoutPrice(
    @Body()
    body: {
      userId: string;
      items: { type: 'mart' | 'food' | 'pharma' | 'rashan'; id: string; quantity: number }[];
      deliveryFee: number;
      couponCode?: string;
      applyWalletPoints: number;
    },
  ) {
    return this.service.calculateCheckoutPrice(body);
  }

  @Post('admin/reconcile-cash')
  @UseGuards(AdminRoleGuard)
  async reconcileCash(@Body() body: { riderId: string; amount: number; referenceId: string }) {
    if (!body.riderId || !body.amount || !body.referenceId) {
      throw new BadRequestException('riderId, amount, and referenceId are mandatory');
    }
    return this.service.reconcileRiderCash(body.riderId, body.amount, body.referenceId);
  }

  @Post('admin/settle-delivery')
  @UseGuards(AdminRoleGuard)
  async settleDelivery(@Body() body: { orderId: string }) {
    if (!body.orderId) throw new BadRequestException('orderId is required');
    await this.service.processOrderSettlement(body.orderId);
    return { success: true };
  }

  @Post('admin/refund-order')
  @UseGuards(AdminRoleGuard)
  async refundOrder(@Body() body: { orderId: string }) {
    if (!body.orderId) throw new BadRequestException('orderId is required');
    await this.service.processOrderRefund(body.orderId);
    return { success: true };
  }

  /**
   * Pipeline Telemetry: Real-time aggregated stats
   */
  @Get('admin/telemetry')
  @UseGuards(AdminRoleGuard)
  async getTelemetry() {
    const rawWalletStats = await this.connection.manager
      .createQueryBuilder(Wallet, 'w')
      .select([
        `SUM(CASE WHEN w.userType IN ('Vendor', 'Rider') AND w.balance > 0 THEN w.balance ELSE 0 END) as platform_liability`,
        `SUM(w.cashInHand) as rider_risk`,
      ])
      .getRawOne();

    const netProfitResult = await this.connection.manager
      .createQueryBuilder(PremiumFinancialLedgerEntry, 'e')
      .where("e.accountTag = 'PLATFORM_REV'")
      .select([
        `SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END) as net_profit`,
      ])
      .getRawOne();

    const rashanMarginResult = await this.connection.manager
      .createQueryBuilder(PremiumFinancialLedgerEntry, 'e')
      .where("e.accountTag = 'PLATFORM_REV' AND e.moduleType = 'rashan'")
      .select([
        `SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END) as rashan_margin`,
      ])
      .getRawOne();

    return {
      platformLiability: Number(rawWalletStats?.platform_liability || 0),
      riderCodRisk: Number(rawWalletStats?.rider_risk || 0),
      consolidatedNetProfit: Number(netProfitResult?.net_profit || 0),
      bulkRashanMargin: Number(rashanMarginResult?.rashan_margin || 0),
    };
  }
}
