import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { SubOrder } from './sub-order.entity';
import { OrderHistory } from './order-history.entity';
import { OrderChatMessage } from './order-chat-message.entity';
import { Address } from '../addresses/address.entity';
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
import { VendorsModule } from '../vendors/vendors.module';
import { CleanupService } from './cleanup.service';
import { RashanService } from './rashan.service';
import { RashanController } from './rashan.controller';
import { UsersModule } from '../users/users.module';
import { OrderItemSubscriber } from './order-item.subscriber';
import { OrdersProcessor } from './orders.processor';

import { WalletsModule } from '../wallets/wallets.module';
import { PharmaModule } from '../pharma/pharma.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderHistory, Rider, SubOrder, OrderChatMessage, Address]),
    CartModule,
    DeliveryZonesModule,
    AddressesModule,
    SettingsModule,
    NotificationsModule,
    forwardRef(() => RidersModule),
    UsersModule,
    VendorsModule,
    WalletsModule,
    forwardRef(() => PharmaModule),
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  providers: [OrdersService, OrdersGateway, CleanupService, RashanService, OrderItemSubscriber, OrdersProcessor],
  controllers: [OrdersController, RashanController],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
