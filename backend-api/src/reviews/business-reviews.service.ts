import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessReview } from '../common/business-review.entity';
import { Order } from '../orders/order.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Brand } from '../brands/brand.entity';

@Injectable()
export class BusinessReviewsService {
  constructor(
    @InjectRepository(BusinessReview)
    private reviewRepo: Repository<BusinessReview>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
  ) {}

  async create(data: {
    userId: string;
    orderId: string;
    subOrderId?: string;
    businessId: string;
    businessType: string;
    rating: number;
    comment?: string;
  }) {
    // Verify order exists and belongs to user
    const order = await this.orderRepo.findOne({ 
      where: { id: data.orderId, userId: data.userId } 
    });
    
    if (!order) {
      throw new BadRequestException('Order not found or not authorized');
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException('Can only rate delivered orders');
    }

    // Check if already rated for this specific business/suborder
    const query: any = { orderId: data.orderId };
    if (data.subOrderId) {
      query.subOrderId = data.subOrderId;
    } else if (data.businessType === 'restaurant') {
      query.restaurantId = data.businessId;
    } else {
      query.brandId = data.businessId;
    }

    const existing = await this.reviewRepo.findOne({ where: query });
    if (existing) {
      throw new BadRequestException('This business has already been rated for this order');
    }

    const reviewData: any = {
      userId: data.userId,
      orderId: data.orderId,
      subOrderId: data.subOrderId,
      businessType: data.businessType,
      rating: data.rating,
      comment: data.comment,
    };

    if (data.businessType === 'restaurant') {
      reviewData.restaurantId = data.businessId;
    } else {
      reviewData.brandId = data.businessId;
    }

    const review = this.reviewRepo.create(reviewData);
    const saved = await this.reviewRepo.save(review);

    // Mark order as business rated
    await this.orderRepo.update(data.orderId, { isBusinessRated: true });

    // Recalculate and persist the average rating for the business entity
    await this.recalculateRating(data.businessType, data.businessId);

    return saved;
  }

  private async recalculateRating(businessType: string, businessId: string): Promise<void> {
    const where = businessType === 'restaurant'
      ? { restaurantId: businessId }
      : { brandId: businessId };

    const reviews = await this.reviewRepo.find({ where });
    if (reviews.length === 0) return;

    const avg = reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length;
    const rounded = Math.round(avg * 10) / 10; // e.g. 4.3

    if (businessType === 'restaurant') {
      await this.restaurantRepo.update(businessId, {
        rating: rounded,
        ratingCount: reviews.length,
      } as any);
    } else {
      await this.brandRepo.update(businessId, {
        rating: rounded,
        ratingCount: reviews.length,
      } as any);
    }
  }

  async findAll() {
    return this.reviewRepo.find({
      relations: ['user', 'restaurant', 'brand'],
      order: { createdAt: 'DESC' },
    });
  }
}
