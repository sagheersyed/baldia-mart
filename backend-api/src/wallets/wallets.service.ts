import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, QueryFailedError } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { Order } from '../orders/order.entity';
import { Rider } from '../riders/rider.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletSettlement } from './wallet-settlement.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionsRepository: Repository<WalletTransaction>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepository: Repository<WithdrawalRequest>,
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
   * Handles both single-vendor (restaurant) and multi-vendor (mart/sub-orders) scenarios.
   * Assumes payment method is either 'cash_on_delivery' or 'card'.
   */
  async processOrderSettlement(order: Order, manager: EntityManager) {
    // Idempotency: create a unique settlement record per order.
    // This prevents double-settlement under concurrency without blocking multiple wallet txs per order.
    try {
      await manager.insert(WalletSettlement, { orderId: order.id });
    } catch (err) {
      const isUniqueViolation =
        err instanceof QueryFailedError &&
        // Postgres unique violation
        ((err as any).code === '23505' ||
          typeof (err as any).message === 'string' && (err as any).message.toLowerCase().includes('duplicate'));
      if (isUniqueViolation) {
        console.warn(`[WalletsService] Order ${order.id} already settled. Skipping duplicate.`);
        return;
      }
      throw err;
    }

    const riderId = order.riderId;
    const orderRef = order.id.split('-')[0];

    // Amounts
    const subtotal = Number(order.subtotal);
    const deliveryFee = Number(order.deliveryFee);
    
    // Phase 20: Rider Incentives for Pharma
    let pharmaBonus = 0;
    if (order.orderType === 'pharma') {
      if ((order as any).priority === 'high') pharmaBonus += 50; // Emergency Bonus
      if ((order as any).isColdChain) pharmaBonus += 30; // Cold Chain Bonus
    }

    const riderEarnings = deliveryFee + pharmaBonus; // Rider gets delivery fee + any pharma bonuses

    // Platform Commission (10% of vendor subtotal)
    const platformCommissionPercent = 0.10;

    // ── Build vendor settlement list ──
    // Each entry: { vendorId, vendorSubtotal, vendorEarnings }
    const vendorSettlements: { vendorId: string; vendorSubtotal: number; vendorEarnings: number }[] = [];

    if (order.subOrders && order.subOrders.length > 0) {
      // Multi-vendor: iterate ALL sub-orders
      for (const subOrder of order.subOrders) {
        const vendorId = (subOrder as any).vendorId || (subOrder as any).restaurantId
          || (subOrder as any).vendor?.id || (subOrder as any).restaurant?.id;
        if (vendorId) {
          const subTotal = Number((subOrder as any).subtotal || 0);
          const platformFee = subTotal * platformCommissionPercent;
          vendorSettlements.push({
            vendorId,
            vendorSubtotal: subTotal,
            vendorEarnings: subTotal - platformFee,
          });
        }
      }
    } else if (order.restaurant?.id) {
      // Single restaurant order (food)
      const platformFee = subtotal * platformCommissionPercent;
      vendorSettlements.push({
        vendorId: order.restaurant.id,
        vendorSubtotal: subtotal,
        vendorEarnings: subtotal - platformFee,
      });
    }

    // Total vendor subtotals (for COD rider debit calculation)
    const totalVendorSubtotal = vendorSettlements.reduce((sum, v) => sum + v.vendorSubtotal, 0) || subtotal;

    // 1. Rider collected CASH (COD)
    if (order.paymentMethod === 'cash_on_delivery' && riderId) {
      // Rider has physical cash: Total (Subtotal + Delivery Fee)
      // Rider's own earning is Delivery Fee
      // So Rider owes the platform the Subtotal
      await this.adjustBalance(manager, riderId, 'Rider', totalVendorSubtotal, 'DEBIT',
        `Cash collected for Order #${orderRef} (Platform Fee & Vendor Share)`, order.id);

      // Credit EACH Vendor their share
      for (const vs of vendorSettlements) {
        await this.adjustBalance(manager, vs.vendorId, 'Vendor', vs.vendorEarnings, 'CREDIT',
          `Earnings for Order #${orderRef}`, order.id);
      }
    }
    // 2. Customer paid via CARD (Online)
    else {
      // Platform holds all the money
      // Platform owes Rider the delivery fee
      if (riderId) {
        await this.adjustBalance(manager, riderId, 'Rider', riderEarnings, 'CREDIT',
          `Delivery Fee for Order #${orderRef}`, order.id);
      }

      // Platform owes EACH Vendor their earnings
      for (const vs of vendorSettlements) {
        await this.adjustBalance(manager, vs.vendorId, 'Vendor', vs.vendorEarnings, 'CREDIT',
          `Earnings for Order #${orderRef}`, order.id);
      }
    }
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

    query.orderBy('wallet.updatedAt', 'DESC');
    return query.getMany();
  }

  // --- Withdrawal Request Workflow ---

  async createWithdrawalRequest(userId: string, userType: string, data: { amount: number; bankName?: string; accountNumber?: string; accountName?: string }) {
    const wallet = await this.getWallet(userId, userType as any);
    
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
    return this.withdrawalRepository.find({
      where: { status: 'PENDING' },
      relations: ['wallet'],
      order: { createdAt: 'DESC' }
    });
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

      return this.adjustBalance(
        manager, 
        wallet.userId, 
        wallet.userType as 'Rider'|'Vendor'|'User', 
        Math.abs(amount), 
        type, 
        description,
        undefined,
        auditData
      );
    });
  }
}
