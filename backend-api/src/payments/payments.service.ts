import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Order } from '../orders/order.entity';
import {
  buildJazzCashPayload,
  getJazzCashFormUrl,
  verifyJazzCashHash,
  isJazzCashSuccess,
} from './providers/jazzcash.provider';
import {
  buildEasyPaisaPayload,
  getEasyPaisaFormUrl,
  verifyEasyPaisaHash,
  isEasyPaisaSuccess,
} from './providers/easypaisa.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepo: Repository<Payment>,
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
  ) { }

  /**
   * Generate a unique merchant reference.
   * Format: T + timestamp + random 4-digit suffix
   */
  private generateMerchantRef(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `T${ts}${rand}`;
  }

  /**
   * Initiate a payment — returns form fields + URL for hosted checkout redirect.
   */
  async initiatePayment(opts: {
    orderId: string;
    userId: string;
    provider: 'jazzcash' | 'easypaisa';
    amount: number;
    mobileNumber?: string;
  }) {
    const order = await this.ordersRepo.findOne({ where: { id: opts.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== opts.userId) {
      throw new BadRequestException('Order does not belong to current user');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }
    const serverAmount = Number(order.total);
    if (!Number.isFinite(serverAmount) || serverAmount <= 0) {
      throw new BadRequestException('Order has invalid payable total');
    }
    if (Math.abs(serverAmount - Number(opts.amount)) > 0.01) {
      throw new BadRequestException('Payment amount mismatch with order total');
    }

    const merchantRef = this.generateMerchantRef();
    const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:3000';
    const returnUrl = `${serverBase}/api/v1/payments/callback/${opts.provider}`;
    const callbackUrl = returnUrl;

    let formUrl: string;
    let formFields: Record<string, string>;

    if (opts.provider === 'jazzcash') {
      formUrl = getJazzCashFormUrl();
      formFields = buildJazzCashPayload({
        merchantRef,
        amount: serverAmount,
        description: `Order Payment`,
        returnUrl,
        callbackUrl,
        mobileNumber: opts.mobileNumber,
      });
    } else if (opts.provider === 'easypaisa') {
      formUrl = getEasyPaisaFormUrl();
      formFields = buildEasyPaisaPayload({
        merchantRef,
        amount: serverAmount,
        returnUrl,
        callbackUrl,
        mobileNumber: opts.mobileNumber,
      });
    } else {
      throw new BadRequestException(`Unsupported provider: ${opts.provider}`);
    }

    // Persist the payment record
    const payment = this.paymentsRepo.create({
      orderId: opts.orderId,
      userId: opts.userId,
      provider: opts.provider,
      merchantRef,
      amount: serverAmount,
      currency: 'PKR',
      status: 'pending',
      checkoutUrl: formUrl,
    });
    await this.paymentsRepo.save(payment);

    this.logger.log(`Payment initiated: ${merchantRef} (${opts.provider}) for order ${opts.orderId}`);

    return {
      paymentId: payment.id,
      merchantRef,
      formUrl,
      formFields,
    };
  }

  /**
   * Process a provider callback (POST from JazzCash/EasyPaisa servers).
   * Returns the updated payment record.
   */
  async handleCallback(provider: string, payload: Record<string, any>): Promise<Payment> {
    this.logger.log(`[${provider}] Callback received: ${JSON.stringify(payload).slice(0, 500)}`);

    // Extract merchant ref from the callback payload
    const merchantRef =
      payload.pp_TxnRefNo ||       // JazzCash
      payload.orderRefNum ||       // EasyPaisa
      payload.orderId ||
      '';

    if (!merchantRef) {
      this.logger.warn(`[${provider}] Callback missing merchant ref`);
      throw new BadRequestException('Missing transaction reference');
    }

    const payment = await this.paymentsRepo.findOne({ where: { merchantRef } });
    if (!payment) {
      this.logger.warn(`[${provider}] Payment not found for ref: ${merchantRef}`);
      throw new NotFoundException(`Payment not found for ref: ${merchantRef}`);
    }

    // Avoid re-processing already finalized payments
    if (payment.status === 'paid' || payment.status === 'failed') {
      this.logger.log(`[${provider}] Payment ${merchantRef} already finalized as ${payment.status}`);
      return payment;
    }

    // Verify hash integrity
    let hashValid = false;
    let isSuccess = false;
    let responseCode = '';
    let responseMessage = '';

    if (provider === 'jazzcash') {
      hashValid = verifyJazzCashHash(payload);
      responseCode = payload.pp_ResponseCode || '';
      responseMessage = payload.pp_ResponseMessage || '';
      isSuccess = isJazzCashSuccess(responseCode);
      payment.providerTxnId = payload.pp_RetreivalReferenceNo || payload.pp_TxnRefNo || '';
    } else if (provider === 'easypaisa') {
      hashValid = verifyEasyPaisaHash(payload);
      responseCode = payload.responseCode || payload.status || '';
      responseMessage = payload.responseDesc || payload.responseMessage || '';
      isSuccess = isEasyPaisaSuccess(responseCode);
      payment.providerTxnId = payload.transactionId || payload.orderRefNum || '';
    }

    if (!hashValid) {
      this.logger.warn(`[${provider}] Hash verification FAILED for ${merchantRef}`);
      // Still update the record but mark as failed
      payment.status = 'failed';
      payment.responseCode = 'HASH_FAIL';
      payment.responseMessage = 'Hash verification failed — possible tampering';
      payment.callbackPayload = payload;
      await this.paymentsRepo.save(payment);
      return payment;
    }

    payment.status = isSuccess ? 'paid' : 'failed';
    payment.responseCode = responseCode;
    payment.responseMessage = responseMessage;
    payment.callbackPayload = payload;
    await this.paymentsRepo.save(payment);

    this.logger.log(`[${provider}] Payment ${merchantRef} → ${payment.status} (code: ${responseCode})`);

    return payment;
  }

  /**
   * Get payment status by our payment ID.
   */
  async getPaymentById(paymentId: string): Promise<Payment> {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getPaymentByIdForUser(paymentId: string, userId: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (payment.userId !== userId) throw new NotFoundException('Payment not found');
    return payment;
  }

  /**
   * Get payment by order ID (latest).
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentsRepo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPaymentByOrderIdForUser(orderId: string, userId: string): Promise<Payment | null> {
    return this.paymentsRepo.findOne({
      where: { orderId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get payment by merchant reference.
   */
  async getPaymentByMerchantRef(merchantRef: string): Promise<Payment | null> {
    return this.paymentsRepo.findOne({ where: { merchantRef } });
  }
}
