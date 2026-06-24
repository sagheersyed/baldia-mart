import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Coupon, DiscountType } from './coupon.entity';
import { Order } from '../orders/order.entity';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Admin: Fetch all coupons with pagination
   */
  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.couponRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /**
   * Admin: Create a new promotional coupon
   */
  async create(data: Partial<Coupon>) {
    const existing = await this.couponRepository.findOne({ where: { code: data.code } });
    if (existing) throw new BadRequestException('A coupon with this code already exists.');
    
    const coupon = this.couponRepository.create(data);
    return this.couponRepository.save(coupon);
  }

  /**
   * Admin: Update an existing coupon
   */
  async update(id: string, data: Partial<Coupon>) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    
    Object.assign(coupon, data);
    return this.couponRepository.save(coupon);
  }

  /**
   * Admin: Delete a coupon
   */
  async delete(id: string) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    await this.couponRepository.remove(coupon);
    return { success: true };
  }

  /**
   * Validates a coupon code against a user's cart and business rules.
   */
  async validateCoupon(
    userId: string,
    couponCode: string,
    subtotal: number,
    vendorIds: string[],
  ): Promise<{ 
    success: boolean; 
    coupon?: Coupon; 
    discount_amount: number; 
    final_payable_amount: number; 
    error_message?: string 
  }> {
    
    // 1. Existence and Active Check
    const coupon = await this.couponRepository.findOne({ 
      where: { code: couponCode, isActive: true } 
    });

    if (!coupon) {
      return { success: false, discount_amount: 0, final_payable_amount: subtotal, error_message: 'Invalid or inactive coupon code.' };
    }

    // 2. Date Validity Check
    const now = new Date();
    if (now < coupon.start_date || now > coupon.end_date) {
      return { success: false, discount_amount: 0, final_payable_amount: subtotal, error_message: 'Coupon has expired or is not yet active.' };
    }

    // 3. Minimum Order Value Check
    if (subtotal < coupon.min_order_value) {
      return { 
        success: false, 
        discount_amount: 0, 
        final_payable_amount: subtotal, 
        error_message: `Minimum order value of Rs. ${coupon.min_order_value} is required for this coupon.` 
      };
    }

    // 4. Global Usage Limit Check
    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
      return { success: false, discount_amount: 0, final_payable_amount: subtotal, error_message: 'Coupon usage limit has been reached.' };
    }

    // 5. User Specific Limit Check
    const userUsageCount = await this.orderRepository.count({
      where: { userId, couponCode, status: MoreThan('cancelled') }
    });

    if (userUsageCount >= coupon.user_limit) {
      return { success: false, discount_amount: 0, final_payable_amount: subtotal, error_message: 'You have already reached the maximum usage limit for this coupon.' };
    }

    // 6. Eligible Vendors Check (Optional)
    if (coupon.eligible_vendors && coupon.eligible_vendors.length > 0) {
      const isEligible = vendorIds.some(vId => coupon.eligible_vendors.includes(vId));
      if (!isEligible) {
        return { success: false, discount_amount: 0, final_payable_amount: subtotal, error_message: 'This coupon is not valid for the selected items/vendors.' };
      }
    }

    // 7. Calculate Discount
    let discountAmount = 0;
    if (coupon.discount_type === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return {
      success: true,
      coupon,
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      final_payable_amount: parseFloat((subtotal - discountAmount).toFixed(2)),
    };
  }

  async incrementUsage(couponCode: string, transactionManager?: any): Promise<void> {
    const repo = transactionManager ? transactionManager.getRepository(Coupon) : this.couponRepository;
    await repo.increment({ code: couponCode }, 'used_count', 1);
  }
}
