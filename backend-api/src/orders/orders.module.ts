import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { CartModule } from '../cart/cart.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { AddressesModule } from '../addresses/addresses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    CartModule,
    DeliveryZonesModule,
    AddressesModule,
  ],
  providers: [OrdersService, OrdersGateway],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
