import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { HealthController } from './common/health.controller';
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
import { OtpModule } from './otp/otp.module';
import { SettingsModule } from './settings/settings.module';
import { UploadModule } from './upload/upload.module';
import { BrandsModule } from './brands/brands.module';
import { BannersModule } from './banners/banners.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { ReviewsModule } from './reviews/reviews.module';

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
import { RiderReview } from './riders/rider-review.entity';
import { Otp } from './otp/otp.entity';
import { OrderHistory } from './orders/order-history.entity';
import { SubOrder } from './orders/sub-order.entity';
import { Setting } from './settings/setting.entity';
import { Brand } from './brands/brand.entity';
import { Banner } from './banners/banner.entity';
import { Restaurant } from './restaurants/restaurant.entity';
import { MenuItem } from './menu-items/menu-item.entity';
import { BusinessReview } from './common/business-review.entity';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 minute window
      limit: 300,   // 300 requests per minute per IP (reasonable for a mobile app)
    }]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' 
          ? { target: 'pino-pretty' } 
          : undefined,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'baldia_mart',
      entities: [
        User, Address, DeliveryZone, Category, Product, 
        CartItem, Order, OrderItem, Payment, Notification, Rider, Otp,
        OrderHistory, RiderReview, Setting, Brand, Banner, Restaurant, MenuItem, SubOrder, BusinessReview
      ],

      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TerminusModule,
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
    OtpModule,
    AnalyticsModule,
    SettingsModule,
    UploadModule,
    BrandsModule,
    BannersModule,
    RestaurantsModule,
    MenuItemsModule,
    ReviewsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
