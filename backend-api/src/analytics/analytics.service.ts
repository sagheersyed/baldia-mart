import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Rider } from '../riders/rider.entity';
import { Prescription } from '../pharma/prescriptions/prescription.entity';

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

  async getPharmaMetrics(range?: string, startDate?: string, endDate?: string) {
    const { start: periodStart, end: periodEnd } = this.resolveDateRange(range, startDate, endDate);

    try {
      const [
        totalPharmaRevenue,
        topMedicines,
        prescriptionStats,
        nearExpiryCount,
        pharmaIncentives,
      ] = await Promise.all([
        // 1. Pharma Revenue
        this.orderRepository.createQueryBuilder('o')
          .select('SUM(CAST(o.total AS NUMERIC))', 'total')
          .where('o.orderType = :type', { type: 'pharma' })
          .andWhere('o.status = :status', { status: 'delivered' })
          .andWhere('o.createdAt >= :start', { start: periodStart })
          .andWhere('o.createdAt <= :end', { end: periodEnd })
          .getRawOne(),

        // 2. Top Medicines
        this.orderRepository.manager.getRepository('Medicine').find({
          order: { soldCount: 'DESC' },
          take: 10,
          where: { isActive: true },
        }),

        // 3. Prescription Conversion
        this.orderRepository.manager.getRepository('Prescription').createQueryBuilder('rx')
          .select('status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('status')
          .getRawMany(),

        // 4. Near-Expiry Count
        this.orderRepository.manager.getRepository('PharmacyInventory').count({
          where: {
            expiryDate: LessThanOrEqual(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            isQuarantined: false,
          },
        }),

        // 5. Pharma Rider Incentives (Phase 20 logic)
        this.orderRepository.createQueryBuilder('o')
          .select('SUM(CASE WHEN o.priority = \'high\' THEN 50 ELSE 0 END + CASE WHEN o.is_cold_chain = true THEN 30 ELSE 0 END)', 'total')
          .where('o.orderType = :type', { type: 'pharma' })
          .andWhere('o.status = :status', { status: 'delivered' })
          .andWhere('o.createdAt >= :start', { start: periodStart })
          .andWhere('o.createdAt <= :end', { end: periodEnd })
          .getRawOne(),
      ]);

      const rxApproved = Number(prescriptionStats.find(s => s.status === 'approved')?.count || 0);
      const rxRejected = Number(prescriptionStats.find(s => s.status === 'rejected')?.count || 0);
      const rxPending = Number(prescriptionStats.find(s => s.status === 'pending')?.count || 0);
      const totalRx = rxApproved + rxRejected + rxPending;

      // 6. Daily pharma order trend (last 14 days)
      let dailyTrend: any[] = [];
      try {
        dailyTrend = await this.orderRepository.createQueryBuilder('o')
          .select("TO_CHAR(o.createdAt, 'YYYY-MM-DD')", 'date')
          .addSelect('COUNT(*)', 'orders')
          .addSelect('SUM(CAST(o.total AS NUMERIC))', 'revenue')
          .where('o.orderType = :type', { type: 'pharma' })
          .andWhere('o.createdAt >= :start', { start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) })
          .groupBy("TO_CHAR(o.createdAt, 'YYYY-MM-DD')")
          .orderBy("TO_CHAR(o.createdAt, 'YYYY-MM-DD')", 'ASC')
          .getRawMany();
      } catch (e) { console.warn('Daily trend query failed (non-critical):', e); }

      // 7. Quotation stats
      let quotationStats: any = { total: 0, accepted: 0, rejected: 0, expired: 0, conversionRate: 0 };
      try {
        const qStats = await this.orderRepository.manager.getRepository('PrescriptionQuotation')
          .createQueryBuilder('q')
          .select('q.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('q.status')
          .getRawMany();
        
        const qAccepted = Number(qStats.find((s: any) => s.status === 'accepted')?.count || 0);
        const qRejected = Number(qStats.find((s: any) => s.status === 'rejected')?.count || 0);
        const qExpired = Number(qStats.find((s: any) => s.status === 'expired')?.count || 0);
        const qPending = Number(qStats.find((s: any) => s.status === 'pending')?.count || 0);
        const qTotal = qAccepted + qRejected + qExpired + qPending;
        quotationStats = {
          total: qTotal,
          accepted: qAccepted,
          rejected: qRejected,
          expired: qExpired,
          pending: qPending,
          conversionRate: qTotal > 0 ? (qAccepted / qTotal) * 100 : 0,
        };
      } catch (e) { console.warn('Quotation stats query failed (non-critical):', e); }

      // 8. Average delivery time for pharma orders
      let avgDeliveryMinutes = 0;
      try {
        const avgResult = await this.orderRepository.createQueryBuilder('o')
          .select("AVG(EXTRACT(EPOCH FROM (o.updatedAt - o.createdAt)) / 60)", 'avgMinutes')
          .where('o.orderType = :type', { type: 'pharma' })
          .andWhere('o.status = :status', { status: 'delivered' })
          .andWhere('o.createdAt >= :start', { start: periodStart })
          .andWhere('o.createdAt <= :end', { end: periodEnd })
          .getRawOne();
        avgDeliveryMinutes = Math.round(Number(avgResult?.avgMinutes) || 0);
      } catch (e) { console.warn('Avg delivery time query failed (non-critical):', e); }

      return {
        revenue: Number(totalPharmaRevenue?.total) || 0,
        topMedicines,
        prescriptions: {
          total: totalRx,
          approved: rxApproved,
          rejected: rxRejected,
          pending: rxPending,
          conversionRate: totalRx > 0 ? (rxApproved / totalRx) * 100 : 0,
        },
        nearExpiryCount,
        riderIncentives: Number(pharmaIncentives?.total) || 0,
        dailyTrend: dailyTrend.map(d => ({ date: d.date, orders: Number(d.orders), revenue: Number(d.revenue) || 0 })),
        quotationStats,
        avgDeliveryMinutes,
      };
    } catch (error) {
      console.error('Failed to get pharma metrics', error);
      throw error;
    }
  }

  async getControlledSubstancesReport(filters?: {
    startDate?: string;
    endDate?: string;
    pharmacyId?: string;
  }) {
    const qb = this.orderRepository.createQueryBuilder('o')
      .innerJoin('o.items', 'i')
      .innerJoin('i.medicine', 'm')
      .innerJoin('o.user', 'u')
      .innerJoin('o.pharmacy', 'p')
      .leftJoin(Prescription, 'pr', 'CAST(pr.id AS varchar) = o.prescriptionId')
      .where('o.orderType = :type', { type: 'pharma' })
      .andWhere('o.status = :status', { status: 'delivered' })
      .andWhere('m.isControlled = :isControlled', { isControlled: true });

    if (filters?.pharmacyId) {
      qb.andWhere('o.pharmacyId = :pharmacyId', { pharmacyId: filters.pharmacyId });
    }

    if (filters?.startDate) {
      qb.andWhere('o.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('o.createdAt <= :endDate', { endDate: end });
    }

    return qb
      .select([
        'o.id as "orderId"',
        'o.createdAt as "orderDate"',
        'u.name as "customerName"',
        'u.phoneNumber as "customerPhone"',
        'p.name as "pharmacyName"',
        'p.licenseNumber as "pharmacyLicense"',
        'm.name as "medicineName"',
        'm.genericName as "genericName"',
        'i.quantity as "quantity"',
        'i.priceAtTime as "price"',
        'pr.id as "prescriptionId"',
        'pr.doctorName as "doctorName"',
        'pr.doctorPmdcReg as "doctorPmdcReg"',
        'pr.patientName as "patientName"',
        'pr.prescriptionDate as "prescriptionDate"'
      ])
      .orderBy('o.createdAt', 'DESC')
      .getRawMany();
  }
}
