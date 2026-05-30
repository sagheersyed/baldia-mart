import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Rider } from './rider.entity';
import { RiderReview } from './rider-review.entity';
import { Order } from '../orders/order.entity';
import { CacheService } from '../cache/cache.service';

import { OrdersGateway } from '../orders/orders.gateway';
import { Inject, forwardRef } from '@nestjs/common';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';

@Injectable()
export class RidersService {
  private readonly logger = new Logger(RidersService.name);
  constructor(
    @InjectRepository(Rider)
    private ridersRepository: Repository<Rider>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
    private deliveryZonesService: DeliveryZonesService,
    private cacheService: CacheService,
  ) {}

  async findByPhone(phoneNumber: string): Promise<Rider | null> {
    return this.ridersRepository.findOne({ where: { phoneNumber } });
  }

  async findById(id: string): Promise<Rider | null> {
    const cacheKey = `rider:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached === 'NOT_FOUND') return null;
    if (cached) return cached;

    const rider = await this.ridersRepository.findOne({ where: { id } });
    if (rider) {
      await this.cacheService.set(cacheKey, rider, 3600);
    } else {
      // Cache the absence of the rider for 5 minutes (negative caching)
      // to protect the DB from connection floods using invalid IDs.
      await this.cacheService.set(cacheKey, 'NOT_FOUND', 300);
    }
    return rider;
  }

  async findAll(): Promise<any[]> {
    const riders = await this.ridersRepository.find({
      order: { createdAt: 'DESC' }
    });

    const activeOrders = await this.ordersRepository.find({
      where: { status: In(['confirmed', 'preparing', 'out_for_delivery']) },
      select: ['id', 'riderId', 'status', 'total']
    });

    return riders.map(rider => ({
      ...rider,
      activeOrders: activeOrders.filter(o => o.riderId === rider.id)
    }));
  }

  async findAllActivePharmaRiders(): Promise<Rider[]> {
    return this.ridersRepository.find({
      where: { isActive: true, isPharmaApproved: true },
    });
  }

  async create(riderData: Partial<Rider>): Promise<Rider> {
    const rider = this.ridersRepository.create(riderData);
    return this.ridersRepository.save(rider);
  }

  async update(id: string, updateData: Partial<Rider>): Promise<Rider | null> {
    await this.ridersRepository.update(id, updateData);
    await this.cacheService.del(`rider:${id}`);
    return this.ridersRepository.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: { isActive?: boolean; isProfileComplete?: boolean }): Promise<Rider | null> {
    await this.ridersRepository.update(id, status);
    await this.cacheService.del(`rider:${id}`);
    
    if (status.isActive === false) {
      this.ordersGateway.kickRider(id);
    }

    return this.ridersRepository.findOne({ where: { id } });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncLocations() {
    this.logger.log('🔄 Syncing rider locations from Redis to PostgreSQL...');
    
    // 1. Get all online riders
    const onlineRiders = await this.ridersRepository.find({
      where: { isOnline: true },
      select: ['id']
    });

    if (onlineRiders.length === 0) return;

    // 2. Fetch locations from Redis in parallel
    const syncPromises = onlineRiders.map(async (rider) => {
      const loc = await this.cacheService.getRiderLocation(rider.id);
      if (loc) {
        return this.ridersRepository.update(rider.id, {
          currentLat: loc.lat,
          currentLng: loc.lng
        });
      }
    });

    await Promise.all(syncPromises);
    this.logger.log(`✅ Synced ${onlineRiders.length} rider locations.`);
  }

  async updateLocation(id: string, lat: number, lng: number): Promise<void> {
    await this.ridersRepository.update(id, { currentLat: lat, currentLng: lng });
  }

  async getRiderStats(riderId: string) {
    const rider = await this.ridersRepository.findOne({ where: { id: riderId } });
    if (!rider) return null;

    const totalStats = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.delivery_fee + order.rider_commission)', 'earnings')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.rider_id = :riderId', { riderId })
      .andWhere("order.status = 'delivered'")
      .getRawOne();
      
    const totalDeliveries = Number(totalStats?.count) || 0;
    const computedTotalEarnings = Number(totalStats?.earnings) || 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    // Better way for today's earnings using QueryBuilder or specific comparison
    const todayStats = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.delivery_fee + order.rider_commission)', 'earnings')
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
      totalEarnings: computedTotalEarnings,
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
      .addSelect('SUM(order.delivery_fee + order.rider_commission)', 'earnings')
      .addSelect('COUNT(order.id)', 'deliveries')
      .where('order.rider_id = :riderId', { riderId })
      .andWhere("order.status = 'delivered'")
      .groupBy("TO_CHAR(order.updated_at, 'YYYY-MM')")
      .orderBy("TO_CHAR(order.updated_at, 'YYYY-MM')", 'DESC')
      .limit(6)
      .getRawMany();

    const rider = await this.ridersRepository.findOne({ where: { id: riderId } });

    return {
      monthly: stats.map(s => ({
        month: s.month,
        earnings: Number(s.earnings) || 0,
        deliveries: Number(s.deliveries) || 0
      })),
      performanceBonus: Number(rider?.performanceBonus) || 0,
      lifetimeCommission: Number(rider?.lifetimeCommission) || 0
    };
  }

  async findBestRidersForOrder(order: any): Promise<any[]> {
    // 2. Pickup coordinates for the NEW order
    let pLat = 24.91522600; 
    let pLng = 66.96431980;
    
    if (order.orderType === 'food' && order.restaurant) {
      pLat = Number(order.restaurant.latitude) || pLat;
      pLng = Number(order.restaurant.longitude) || pLng;
    } else if (order.orderType === 'food' && order.subOrders?.length > 0) {
      const first = order.subOrders[0].restaurant;
      if (first) {
        pLat = Number(first.latitude) || pLat;
        pLng = Number(first.longitude) || pLng;
      }
    } else if (order.orderType === 'mart' && order.subOrders?.length > 0) {
      const firstStop = order.subOrders.find((s: any) => s.pickupSequence === 1) || order.subOrders[0];
      if (firstStop && firstStop.vendor) {
        pLat = Number(firstStop.vendor.lat) || pLat;
        pLng = Number(firstStop.vendor.lng) || pLng;
      }
    }

    // 1. Get nearby riders from Redis (Fast GEORADIUS)
    const nearbyRiderIds = await this.cacheService.getNearbyRiders(pLat, pLng, 10); // 10km radius
    if (nearbyRiderIds.length === 0) return [];

    // 2. Get rider details from DB for those IDs
    const whereClause: any = { id: In(nearbyRiderIds), isActive: true, isOnline: true };
    if (order.orderType === 'pharma') {
      whereClause.isPharmaApproved = true;
    }
    const onlineRiders = await this.ridersRepository.find({
      where: whereClause,
    });

    if (onlineRiders.length === 0) return [];

    // New order Drop-off coordinates
    let dLat = Number(order.address?.latitude) || pLat;
    let dLng = Number(order.address?.longitude) || pLng;

    // 3. Preload active orders once (avoid per-rider queries)
    const activeOrders = await this.ordersRepository.manager.getRepository(Order).find({
      where: { status: In(['confirmed', 'preparing', 'out_for_delivery']) },
      relations: ['address'],
      select: ['id', 'riderId', 'status'],
    });
    const activeOrdersByRider = new Map<string, Order[]>();
    for (const activeOrder of activeOrders) {
      if (!activeOrder.riderId) continue;
      const existing = activeOrdersByRider.get(activeOrder.riderId) || [];
      existing.push(activeOrder);
      activeOrdersByRider.set(activeOrder.riderId, existing);
    }

    // 4. Score riders
    // Score = (Distance * 10) + (ActiveOrdersPenalty) - (Rating * 2) - (BatchBonus)
    // Lower score is better
    const scoredRiders = await Promise.all(onlineRiders.map(async (rider) => {
      let score = 0;
      let isBatchable = false;

      const riderLat = Number(rider.currentLat) || pLat;
      const riderLng = Number(rider.currentLng) || pLng;

      const distToPickup = this.deliveryZonesService.calculateDistance(
        pLat, pLng, riderLat, riderLng
      );

      const riderActiveOrders = activeOrdersByRider.get(rider.id) || [];

      let activeOrdersPenalty = riderActiveOrders.length * 5;
      let batchBonus = 0;

      // Check for Batched Order Opportunity
      for (const activeOrder of riderActiveOrders) {
        // If the order is already out for delivery, it's too late to batch a new pickup
        if (activeOrder.status === 'out_for_delivery') {
          activeOrdersPenalty += 10; // Extra penalty for disrupting an ongoing delivery
          continue;
        }

        // Calculate pickup proximity
        let activePLat = 24.91522600, activePLng = 66.96431980;
        // In a fully optimized system we'd join restaurant/vendor for activeOrder too, 
        // but since we don't have it loaded here, we can assume Baldia Mart default or roughly the same area.
        // Actually, if we use orderType we can do a rough check. For now, let's focus on Drop-off proximity.
        
        let activeDLat = Number(activeOrder.address?.latitude) || pLat;
        let activeDLng = Number(activeOrder.address?.longitude) || pLng;
        
        if (activeDLat && activeDLng && dLat && dLng) {
          const dropoffDist = this.deliveryZonesService.calculateDistance(dLat, dLng, activeDLat, activeDLng);
          
          // If drop-offs are within 2km, this is a highly batchable route
          if (dropoffDist <= 2.0) {
            isBatchable = true;
            batchBonus = 20; // Massive score reduction to prioritize this rider
            activeOrdersPenalty = 0; // Remove penalty because batching is efficient
            break;
          }
        }
      }

      // Final Score Calculation
      score = (distToPickup * 10) + activeOrdersPenalty - ((Number(rider.averageRating) || 5) * 2) - batchBonus;
      
      return { rider, score, dist: distToPickup, isBatchable };
    }));

    // 5. Return top 5 best matches with metadata
    return scoredRiders
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(s => ({
        rider: s.rider,
        score: s.score,
        isBatchable: s.isBatchable
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

