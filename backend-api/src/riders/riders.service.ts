import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Rider } from './rider.entity';
import { RiderReview } from './rider-review.entity';
import { Order } from '../orders/order.entity';

import { OrdersGateway } from '../orders/orders.gateway';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class RidersService {
  constructor(
    @InjectRepository(Rider)
    private ridersRepository: Repository<Rider>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
  ) {}

  async findByPhone(phoneNumber: string): Promise<Rider | null> {
    return this.ridersRepository.findOne({ where: { phoneNumber } });
  }

  async findById(id: string): Promise<Rider | null> {
    return this.ridersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<Rider[]> {
    return this.ridersRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async create(riderData: Partial<Rider>): Promise<Rider> {
    const rider = this.ridersRepository.create(riderData);
    return this.ridersRepository.save(rider);
  }

  async update(id: string, updateData: Partial<Rider>): Promise<Rider | null> {
    await this.ridersRepository.update(id, updateData);
    return this.ridersRepository.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: { isActive?: boolean; isProfileComplete?: boolean }): Promise<Rider | null> {
    await this.ridersRepository.update(id, status);
    
    if (status.isActive === false) {
      this.ordersGateway.kickRider(id);
    }

    return this.ridersRepository.findOne({ where: { id } });
  }

  async getRiderStats(riderId: string) {
    const rider = await this.ridersRepository.findOne({ where: { id: riderId } });
    if (!rider) return null;

    const totalDeliveries = await this.ordersRepository.count({
      where: { riderId, status: 'delivered' }
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    // Better way for today's earnings using QueryBuilder or specific comparison
    const todayStats = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'earnings')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.rider_id = :riderId', { riderId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.updated_at >= :today", { today: startOfToday })
      .getRawOne();

    const cancelledCount = await this.ordersRepository.count({
      where: { riderId, status: 'cancelled' }
    });
    
    const totalAssigned = totalDeliveries + cancelledCount;
    const completionRate = totalAssigned > 0 ? (totalDeliveries / totalAssigned) * 100 : 100;

    return {
      totalEarnings: Number(rider.totalEarnings) || 0,
      todayEarnings: Number(todayStats?.earnings) || 0,
      totalDeliveries: totalDeliveries,
      todayDeliveries: Number(todayStats?.count) || 0,
      rating: Number(rider.averageRating) || 5.0,
      completionRate: Math.round(completionRate)
    };
  }

  async getMonthlyEarnings(riderId: string) {
    // Generate a breakdown of earnings and deliveries grouped by month for the last 6 months
    const stats = await this.ordersRepository.createQueryBuilder('order')
      .select("TO_CHAR(order.updated_at, 'YYYY-MM')", 'month')
      .addSelect('SUM(order.delivery_fee)', 'earnings') // Rider gets delivery fee
      .addSelect('COUNT(order.id)', 'deliveries')
      .where('order.rider_id = :riderId', { riderId })
      .andWhere("order.status = 'delivered'")
      .groupBy("TO_CHAR(order.updated_at, 'YYYY-MM')")
      .orderBy("TO_CHAR(order.updated_at, 'YYYY-MM')", 'DESC')
      .limit(6)
      .getRawMany();

    return stats.map(s => ({
      month: s.month,
      earnings: Number(s.earnings) || 0,
      deliveries: Number(s.deliveries) || 0
    }));
  }

  async createReview(reviewData: Partial<RiderReview>): Promise<RiderReview> {
    const { riderId, orderId, rating } = reviewData;
    
    // 1. Create the review
    const reviewRepo = this.ridersRepository.manager.getRepository(RiderReview);
    const review = reviewRepo.create(reviewData);
    const savedReview = await reviewRepo.save(review);

    // 2. Update Order Rating Status
    await this.ordersRepository.update(orderId!, { isRated: true });

    // 3. Update Rider Average Rating
    const rider = await this.ridersRepository.findOne({ where: { id: riderId } });
    if (rider) {
      const totalReviews = Number(rider.totalReviews) + 1;
      const currentRating = Number(rider.averageRating);
      // New average = ((Old Avg * Old Count) + New Rating) / New Count
      const newAverage = ((currentRating * Number(rider.totalReviews)) + Number(rating)) / totalReviews;
      
      await this.ridersRepository.update(riderId!, {
        totalReviews: totalReviews,
        averageRating: parseFloat(newAverage.toFixed(2))
      });
    }

    return savedReview;
  }

  async findAllReviews(): Promise<RiderReview[]> {
    const reviewRepo = this.ridersRepository.manager.getRepository(RiderReview);
    return reviewRepo.find({
      relations: ['rider', 'user', 'order'],
      order: { createdAt: 'DESC' }
    });
  }
}

