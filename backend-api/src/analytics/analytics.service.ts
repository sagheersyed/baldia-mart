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

  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

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
        .andWhere('order.createdAt >= :startDate', { startDate: sevenDaysAgo })
        .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD'), TO_CHAR(order.createdAt, 'Mon DD')")
        .orderBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'ASC')
        .getRawMany();

      const salesChartData: { date: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        const formattedLabel = d.toLocaleDateString('en-US', { month: 'short' }) + ' ' + d.getDate().toString().padStart(2, '0');
        const existing = chartStats.find(s => s.date === formattedLabel);

        salesChartData.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: Number(existing?.revenue) || 0,
          orders: Number(existing?.orders) || 0,
        });
      }

      return {
        metrics: {
          totalRevenue,
          totalOrders: totalOrdersCount,
          activeUsers: totalUsers,
          activeRiders: totalRiders,
        },
        salesChartData,
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
