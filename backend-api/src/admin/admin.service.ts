import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  async getDashboardAnalytics() {
    const totalOrders = await this.ordersRepository.count();
    const activeUsers = await this.usersRepository.count();
    
    // Sum total revenue from delivered orders
    const deliveredOrders = await this.ordersRepository.find({ where: { status: 'delivered' } });
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total), 0);

    return {
      totalOrders,
      totalRevenue,
      activeUsers,
    };
  }
}
