import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Rider } from '../riders/rider.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Rider)
    private riderRepository: Repository<Rider>,
  ) { }

  private resolveDateRange(range?: string, startDate?: string, endDate?: string): { start: Date; end: Date; labelFormat: 'weekday' | 'date' } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (range === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const customEnd = new Date(endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(customEnd.getTime())) {
        start.setHours(0, 0, 0, 0);
        customEnd.setHours(23, 59, 59, 999);
        return { start, end: customEnd, labelFormat: 'date' };
      }
    }

    const start = new Date(now);
    if (range === 'yearly') {
      start.setFullYear(now.getFullYear() - 1);
      start.setDate(now.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, labelFormat: 'date' };
    }
    if (range === 'monthly') {
      start.setMonth(now.getMonth() - 1);
      start.setDate(now.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, labelFormat: 'date' };
    }

    // Default weekly (7 days)
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, labelFormat: 'weekday' };
  }

  async getDashboardMetrics(range?: string, startDate?: string, endDate?: string) {
    const { start: periodStart, end: periodEnd, labelFormat } = this.resolveDateRange(range, startDate, endDate);

    try {
      const [
        totalUsers,
        totalRiders,
        totalOrdersCount,
        recentOrders,
      ] = await Promise.all([
        this.userRepository.count(),
        this.riderRepository.createQueryBuilder('rider')
          .where('rider.isOnline = :isOnline', { isOnline: true })
          .andWhere('rider.updatedAt >= :lastHour', {
            lastHour: new Date(Date.now() - 60 * 60 * 1000)
          })
          .getCount(),
        this.orderRepository.count(),
        this.orderRepository.find({
          order: { createdAt: 'DESC' },
          take: 5,
          relations: ['user', 'rider'],
        }),
      ]);

      // Calculate total revenue from delivered orders directly in DB
      const revenueData = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(CAST(order.total AS NUMERIC))', 'total')
        .where('order.status = :status', { status: 'delivered' })
        .getRawOne();
      const totalRevenue = Number(revenueData?.total) || 0;

      // Generate Sales Chart Data for the last 7 days using GROUP BY
      const chartStats = await this.orderRepository
        .createQueryBuilder('order')
        .select("TO_CHAR(order.createdAt, 'Mon DD')", 'date')
        .addSelect('SUM(CAST(order.total AS NUMERIC))', 'revenue')
        .addSelect('COUNT(order.id)', 'orders')
        .where('order.status = :status', { status: 'delivered' })
        .andWhere('order.createdAt >= :startDate', { startDate: periodStart })
        .andWhere('order.createdAt <= :endDate', { endDate: periodEnd })
        .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD'), TO_CHAR(order.createdAt, 'Mon DD')")
        .orderBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'ASC')
        .getRawMany();

      const salesChartData: { date: string; revenue: number; orders: number }[] = [];
      const cursor = new Date(periodStart);
      while (cursor <= periodEnd) {
        const d = new Date(cursor);
        
        const formattedLabel = d.toLocaleDateString('en-US', { month: 'short' }) + ' ' + d.getDate().toString().padStart(2, '0');
        const existing = chartStats.find(s => s.date === formattedLabel);

        salesChartData.push({
          date: labelFormat === 'weekday'
            ? d.toLocaleDateString('en-US', { weekday: 'short' })
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: Number(existing?.revenue) || 0,
          orders: Number(existing?.orders) || 0,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      return {
        metrics: {
          totalRevenue,
          totalOrders: totalOrdersCount,
          activeUsers: totalUsers,
          activeRiders: totalRiders,
        },
        salesChartData,
        selectedRange: range || 'weekly',
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          customerName: order.user?.name || 'Unknown',
          totalAmount: order.total,
          status: order.status,
          createdAt: order.createdAt
        })),
      };
    } catch (error) {
      console.error('Failed to get dashboard metrics', error);
      throw error;
    }
  }
}
