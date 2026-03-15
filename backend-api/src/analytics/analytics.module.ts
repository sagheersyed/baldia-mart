import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Rider } from '../riders/rider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Rider])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
