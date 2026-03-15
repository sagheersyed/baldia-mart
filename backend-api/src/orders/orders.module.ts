import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderHistory } from './order-history.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { CartModule } from '../cart/cart.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { AddressesModule } from '../addresses/addresses.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Rider } from '../riders/rider.entity';
import { RidersModule } from '../riders/riders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderHistory, Rider]),
    CartModule,
    DeliveryZonesModule,
    AddressesModule,
    SettingsModule,
    NotificationsModule,
    forwardRef(() => RidersModule),
  ],
  providers: [OrdersService, OrdersGateway],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
