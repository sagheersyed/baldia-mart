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
  ) {}

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

      // Calculate total revenue from delivered orders
      const deliveredOrders = await this.orderRepository.find({
        where: { status: 'delivered' },
      });
      const totalRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total), 0);

      // Generate Sales Chart Data for the last 7 days
      const salesChartData: { date: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(today.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        const dayOrders = await this.orderRepository
          .createQueryBuilder('order')
          .where('order.status = :status', { status: 'delivered' })
          .andWhere('order.createdAt >= :startDate', { startDate: targetDate })
          .andWhere('order.createdAt < :endDate', { endDate: nextDay })
          .getMany();

        const dailyRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total), 0);
        const dailyOrderCount = dayOrders.length;
        
        salesChartData.push({
          date: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dailyRevenue,
          orders: dailyOrderCount,
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
