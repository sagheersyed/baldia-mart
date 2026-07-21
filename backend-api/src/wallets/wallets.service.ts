import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, QueryFailedError } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { WalletSettlement } from './wallet-settlement.entity';
import { Order } from '../orders/order.entity';
import { Rider } from '../riders/rider.entity';
import { User } from '../users/user.entity';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionsRepository: Repository<WalletTransaction>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepository: Repository<WithdrawalRequest>,
    @Inject(forwardRef(() => FinanceService))
    private financeService: FinanceService,
    private notificationsService: NotificationsService,
  ) {}

  async getWallet(userId: string, userType: 'Rider' | 'Vendor' | 'User'): Promise<Wallet> {
    let wallet = await this.walletsRepository.findOne({ where: { userId, userType } });
    if (!wallet) {
      wallet = this.walletsRepository.create({ userId, userType, balance: 0 });
      await this.walletsRepository.save(wallet);
    }
    return wallet;
  }

  async getWalletHistory(walletId: string): Promise<WalletTransaction[]> {
    return this.transactionsRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
      relations: ['order'],
    });
  }

  private async adjustBalance(
    manager: EntityManager,
    userId: string,
    userType: 'Rider' | 'Vendor' | 'User',
    amount: number,
    type: 'CREDIT' | 'DEBIT',
    description: string,
    orderId?: string,
    auditData?: { adminId?: string; referenceId?: string; attachmentUrl?: string }
  ) {
    // NOTE: Must be called inside a DB transaction for locks to be effective.
    let wallet = await manager.findOne(Wallet, {
      where: { userId, userType },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      wallet = manager.create(Wallet, { userId, userType, balance: 0 });
      await manager.save(wallet);
    }

    const transaction = manager.create(WalletTransaction, {
      walletId: wallet.id,
      amount,
      type,
      description,
      orderId,
      adminId: auditData?.adminId,
      referenceId: auditData?.referenceId,
      attachmentUrl: auditData?.attachmentUrl,
    });
    await manager.save(transaction);

    if (type === 'CREDIT') {
      wallet.balance = Number(wallet.balance) + Number(amount);
    } else {
      wallet.balance = Number(wallet.balance) - Number(amount);
    }
    
    await manager.save(wallet);
    return wallet;
  }

  /**
   * Processes the financial settlement of a completed order.
   * Delegates detailed ledger recording to FinanceService.
   */
  async processOrderSettlement(order: Order, manager: EntityManager) {
    // Idempotency: create a unique settlement record per order.
    try {
      await manager.insert(WalletSettlement, { orderId: order.id });
    } catch (err) {
      const isUniqueViolation =
        err instanceof QueryFailedError &&
        ((err as any).code === '23505' ||
          typeof (err as any).message === 'string' && (err as any).message.toLowerCase().includes('duplicate'));
      if (isUniqueViolation) {
        console.warn(`[WalletsService] Order ${order.id} already settled. Skipping duplicate.`);
        return;
      }
      throw err;
    }

    // Delegate granular financial recording to the new Finance Engine
    await this.financeService.processOrderSettlement(order, manager);
    
    // Maintain backward compatibility for the simple WalletTransaction table for now
    // (Legacy screens will still show data while we migrate them to use Ledger APIs)
  }

  async getAllWallets(userType?: string): Promise<any[]> {
    const query = this.walletsRepository.createQueryBuilder('wallet');
    
    if (userType) {
      query.where('wallet.userType = :userType', { userType });
    }

    // Join with Rider table for extra details
    query.leftJoinAndMapOne(
      'wallet.rider',
      Rider,
      'rider',
      'rider.id = wallet.userId AND wallet.userType = :riderType',
      { riderType: 'Rider' }
    );

    // Join with User table for regular user details
    query.leftJoinAndMapOne(
      'wallet.user',
      'users',
      'user',
      'user.id = wallet.userId AND wallet.userType = :user_type',
      { user_type: 'User' }
    );

    // Join with Vendor table for merchant details
    query.leftJoinAndMapOne(
      'wallet.vendor',
      'vendors',
      'vendor',
      'vendor.id = wallet.userId AND wallet.userType = :vendorType',
      { vendorType: 'Vendor' }
    );

    // Join with Restaurant table for dining details
    query.leftJoinAndMapOne(
      'wallet.restaurant',
      'restaurants',
      'restaurant',
      'restaurant.id = wallet.userId AND wallet.userType = :restaurantUserType',
      { restaurantUserType: 'Vendor' }
    );

    // Join with Pharmacy table for drug seller details
    query.leftJoinAndMapOne(
      'wallet.pharmacy',
      'pharmacies',
      'pharmacy',
      'pharmacy.id = wallet.userId AND wallet.userType = :pharmacyUserType',
      { pharmacyUserType: 'Vendor' }
    );

    query.orderBy('wallet.updatedAt', 'DESC');
    const wallets = await query.getMany();

    // Enrich wallets where entity profiles are missing due to user-level vendor mapping
    for (const wallet of wallets) {
      const w = wallet as any;
      if (w.userType === 'Vendor') {
        if (!w.vendor && !w.restaurant && !w.pharmacy) {
          // 1. Fetch User details for fallback name
          const userRepo = this.walletsRepository.manager.getRepository('User');
          const user = await userRepo.findOne({ where: { id: w.userId } });
          if (user) {
            w.user = user;
          }

          // 2. Resolve associated store storefront via tenant_users linking
          try {
            const tenantUserRepo = this.walletsRepository.manager.getRepository('TenantUser');
            const memberships = await tenantUserRepo.find({
              where: { userId: w.userId },
              relations: ['tenant'],
            }) as any[];

            for (const membership of memberships) {
              const tenant = membership.tenant;
              if (tenant && tenant.entityId) {
                if (tenant.type === 'restaurant') {
                  const restaurantRepo = this.walletsRepository.manager.getRepository('Restaurant');
                  w.restaurant = await restaurantRepo.findOne({ where: { id: tenant.entityId } });
                } else if (tenant.type === 'pharmacy') {
                  const pharmacyRepo = this.walletsRepository.manager.getRepository('Pharmacy');
                  w.pharmacy = await pharmacyRepo.findOne({ where: { id: tenant.entityId } });
                } else if (tenant.type === 'mart') {
                  const vendorRepo = this.walletsRepository.manager.getRepository('Vendor');
                  w.vendor = await vendorRepo.findOne({ where: { id: tenant.entityId } });
                }
              }
            }
          } catch (e) {
            // Silence sub-query issues during resolution
          }
        }
      }
      if (w.userType === 'Vendor') {
        w.commissionPayable = await this.financeService.getCommissionPayableForWallet(w.id);
      }
    }

    return wallets;
  }

  async getWalletWithTenantFallback(userId: string, userType: 'Rider' | 'Vendor' | 'User', tenantId?: string): Promise<Wallet> {
    let finalUserId = userId;
    let finalUserType = userType;

    if (tenantId) {
      const TenantUserEntity = (await import('../cms/entities/tenant-user.entity')).TenantUser;
      const membership = await this.walletsRepository.manager.getRepository(TenantUserEntity).findOne({
        where: { tenantId, userId },
        relations: ['tenant']
      }) as any;

      if (membership?.tenant?.entityId) {
        finalUserId = membership.tenant.entityId;
        finalUserType = 'Vendor';
      }
    }

    return this.getWallet(finalUserId, finalUserType as any);
  }

  // --- Withdrawal Request Workflow ---

  async createWithdrawalRequest(userId: string, userType: string, data: { amount: number; bankName?: string; accountNumber?: string; accountName?: string }, tenantId?: string) {
    const wallet = await this.getWalletWithTenantFallback(userId, userType as any, tenantId);
    
    if (Number(wallet.balance) < Number(data.amount)) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    const request = this.withdrawalRepository.create({
      walletId: wallet.id,
      amount: data.amount,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      status: 'PENDING'
    });

    return this.withdrawalRepository.save(request);
  }

  async getPendingWithdrawals() {
    const requests = await this.withdrawalRepository.find({
      where: { status: 'PENDING' },
      relations: ['wallet'],
      order: { createdAt: 'DESC' }
    });

    for (const req of requests) {
      if (req.wallet) {
        const wObj = req.wallet as any;
        const reqObj = req as any;

        if (wObj.userType === 'Rider') {
          const riderRepo = this.walletsRepository.manager.getRepository('Rider');
          const rider = await riderRepo.findOne({ where: { id: wObj.userId } });
          wObj.rider = rider;
          reqObj.rider = rider;
        } else if (wObj.userType === 'User') {
          const userRepo = this.walletsRepository.manager.getRepository('User');
          const user = await userRepo.findOne({ where: { id: wObj.userId } });
          wObj.user = user;
          reqObj.user = user;
        } else if (wObj.userType === 'Vendor') {
          try {
            const tenantUserRepo = this.walletsRepository.manager.getRepository('TenantUser');
            const memberships = await tenantUserRepo.find({
              where: { userId: wObj.userId },
              relations: ['tenant'],
            }) as any[];

            for (const membership of memberships) {
              const tenant = membership.tenant;
              if (tenant && tenant.entityId) {
                if (tenant.type === 'restaurant') {
                  const restaurantRepo = this.walletsRepository.manager.getRepository('Restaurant');
                  const rest = await restaurantRepo.findOne({ where: { id: tenant.entityId } });
                  wObj.restaurant = rest;
                  wObj.vendor = rest;
                  reqObj.restaurant = rest;
                  reqObj.vendor = rest;
                } else if (tenant.type === 'pharmacy') {
                  const pharmacyRepo = this.walletsRepository.manager.getRepository('Pharmacy');
                  const pharm = await pharmacyRepo.findOne({ where: { id: tenant.entityId } });
                  wObj.pharmacy = pharm;
                  wObj.vendor = pharm;
                  reqObj.pharmacy = pharm;
                  reqObj.vendor = pharm;
                } else if (tenant.type === 'mart') {
                  const vendorRepo = this.walletsRepository.manager.getRepository('Vendor');
                  const vend = await vendorRepo.findOne({ where: { id: tenant.entityId } });
                  wObj.vendor = vend;
                  reqObj.vendor = vend;
                }
              }
            }

            if (!wObj.vendor && !wObj.restaurant && !wObj.pharmacy) {
              const vendorRepo = this.walletsRepository.manager.getRepository('Vendor');
              const vend = await vendorRepo.findOne({ where: { id: wObj.userId } });
              wObj.vendor = vend;
              reqObj.vendor = vend;
            }
          } catch (e) {
            // Silence sub-query issues during resolution
          }
        }
      }
    }

    return requests;
  }

  async approveWithdrawal(requestId: string, adminId: string, referenceId: string, notes?: string) {
    const request = await this.withdrawalRepository.findOne({ 
      where: { id: requestId },
      relations: ['wallet']
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is already processed');

    return this.walletsRepository.manager.transaction(async (manager) => {
      // 1. Mark as approved
      request.status = 'APPROVED';
      request.adminNotes = notes || null;
      request.referenceId = referenceId;
      await manager.save(request);

      // 2. Adjust wallet balance (DEBIT)
      await this.adjustBalance(
        manager, 
        request.wallet.userId, 
        request.wallet.userType as any, 
        request.amount, 
        'DEBIT', 
        `Withdrawal Approved: ${notes || 'Bank Transfer'}`,
        undefined,
        { adminId, referenceId }
      );

      return request;
    });
  }

  async rejectWithdrawal(requestId: string, notes: string) {
    const request = await this.withdrawalRepository.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Withdrawal request not found');
    
    request.status = 'REJECTED';
    request.adminNotes = notes;
    return this.withdrawalRepository.save(request);
  }

  async manualSettle(walletId: string, amount: number, description: string, auditData: { adminId: string; referenceId: string; attachmentUrl?: string }): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');

    return this.walletsRepository.manager.transaction(async (manager) => {
      // If balance is negative, the user owes us. 
      // If we are "settling", it means they gave us cash, so we CREDIT their account to increase balance towards 0.
      // If balance is positive, we owe the user.
      // If we are "settling", it means we paid them, so we DEBIT their account to decrease balance towards 0.
      
      // Let the admin specify the exact type of transaction based on whether the amount is positive or negative,
      // or we just assume the amount provided is the absolute cash exchanged, and we figure out the direction.
      
      let type: 'CREDIT' | 'DEBIT' = 'CREDIT';
      
      if (Number(wallet.balance) < 0) {
        // User owes platform, so settling means platform received cash.
        // Therefore we CREDIT the user's wallet.
        type = 'CREDIT';
      } else {
        // Platform owes user, so settling means platform paid user.
        // Therefore we DEBIT the user's wallet.
        type = 'DEBIT';
      }

      const updatedWallet = await this.adjustBalance(
        manager, 
        wallet.userId, 
        wallet.userType as 'Rider'|'Vendor'|'User', 
        Math.abs(amount), 
        type, 
        description,
        undefined,
        auditData
      );

      // Send push notification to user / rider / merchant
      try {
        if (wallet.userType === 'Rider') {
          const rider = await manager.getRepository(Rider).findOne({ where: { id: wallet.userId } }) as any;
          if (rider && rider.fcmToken) {
            await this.notificationsService.sendToRider(
              wallet.userId,
              rider.fcmToken,
              'Wallet Adjusted 💼',
              `Your platform balance has been manually adjusted: Rs. ${amount} (${type.toLowerCase()}ed). Ref: ${auditData.referenceId}`
            );
          }
        } else {
          const user = await manager.getRepository(User).findOne({ where: { id: wallet.userId } }) as any;
          if (user && user.fcmToken) {
            await this.notificationsService.sendToUser(
              wallet.userId,
              user.fcmToken,
              'Wallet Adjusted 💼',
              `Your platform balance has been manually adjusted: Rs. ${amount} (${type.toLowerCase()}ed). Ref: ${auditData.referenceId}`
            );
          }
        }
      } catch (err: any) {
        console.error(`Failed to send manual settle notification: ${err.message}`);
      }

      return updatedWallet;
    });
  }
}
