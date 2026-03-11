import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AddressesModule } from './addresses/addresses.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RidersModule } from './riders/riders.module';
import { AdminModule } from './admin/admin.module';

// Entities
import { User } from './users/user.entity';
import { Address } from './addresses/address.entity';
import { DeliveryZone } from './delivery-zones/delivery-zone.entity';
import { Category } from './categories/category.entity';
import { Product } from './products/product.entity';
import { CartItem } from './cart/cart-item.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { Payment } from './payments/payment.entity';
import { Notification } from './notifications/notification.entity';
import { Rider } from './riders/rider.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'baldia_mart',
      entities: [
        User, Address, DeliveryZone, Category, Product, 
        CartItem, Order, OrderItem, Payment, Notification, Rider
      ],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    AddressesModule,
    DeliveryZonesModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
    RidersModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
