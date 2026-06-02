import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rider } from './rider.entity';
import { RiderReview } from './rider-review.entity';
import { Order } from '../orders/order.entity';
import { RidersService } from './riders.service';
import { RidersController } from './riders.controller';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rider, Order, RiderReview]),
    forwardRef(() => OrdersModule),
    DeliveryZonesModule,
  ],
  providers: [RidersService],
  controllers: [RidersController],
  exports: [RidersService],
})
export class RidersModule {}
