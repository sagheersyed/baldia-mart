import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderChatMessage } from './orders/order-chat-message.entity';
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
import { VendorsModule } from './vendors/vendors.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AppCacheModule } from './cache/cache.module';
import { HomeModule } from './home/home.module';
import { PharmaModule } from './pharma/pharma.module';
import { ModuleEventsModule } from './module-events/module-events.module';
import { ModuleEvent } from './module-events/module-event.entity';
import { CouponsModule } from './coupons/coupons.module';
import { Coupon } from './coupons/coupon.entity';

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
import { Vendor } from './vendors/vendor.entity';
import { VendorProduct } from './vendors/vendor-product.entity';
import { Favorite } from './favorites/favorite.entity';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WalletsModule } from './wallets/wallets.module';
import { Wallet } from './wallets/wallet.entity';
import { WalletTransaction } from './wallets/wallet-transaction.entity';
import { WalletSettlement } from './wallets/wallet-settlement.entity';
import { WithdrawalRequest } from './wallets/withdrawal-request.entity';

// Pharma domain entities
import { Medicine } from './pharma/medicines/medicine.entity';
import { Pharmacy } from './pharma/pharmacies/pharmacy.entity';
import { PharmacyInventory } from './pharma/pharmacies/pharmacy-inventory.entity';
import { Prescription } from './pharma/prescriptions/prescription.entity';
import { MedicineSubstitution } from './pharma/substitutions/medicine-substitution.entity';
import { PrescriptionQuotation } from './pharma/prescriptions/prescription-quotation.entity';
import { PharmacyMedicine } from './pharma/pharmacies/pharmacy-medicine.entity';
import { MedicineReview } from './pharma/medicines/medicine-review.entity';
import { PharmaComplianceLog } from './pharma/compliance/pharma-compliance-log.entity';
import { PharmaRecurringOrder } from './pharma/recurring/pharma-recurring-order.entity';
import { MedicineReminder } from './pharma/reminders/medicine-reminder.entity';
import { RefillReminder } from './pharma/reminders/refill-reminder.entity';
import { Doctor } from './pharma/telemedicine/doctor.entity';
import { Consultation } from './pharma/telemedicine/consultation.entity';
import { LabTest } from './pharma/lab/lab-test.entity';
import { LabBooking } from './pharma/lab/lab-booking.entity';
import { DoctorAvailability } from './pharma/telemedicine/availability.entity';
import { LabAvailability } from './pharma/lab/availability.entity';
import { Clinic } from './pharma/telemedicine/clinic.entity';
import { DoctorClinic } from './pharma/telemedicine/doctor-clinic.entity';
import { AvailabilityTemplate } from './pharma/telemedicine/availability-template.entity';

// CMS domain entities & module
import { Tenant } from './cms/entities/tenant.entity';
import { TenantUser } from './cms/entities/tenant-user.entity';
import { ChangeRequest } from './cms/entities/change-request.entity';
import { ChangeRequestDiscussion } from './cms/entities/change-request-discussion.entity';
import { ApprovalRule } from './cms/entities/approval-rule.entity';
import { AuditLog } from './cms/entities/audit-log.entity';
import { CmsModule } from './cms/cms.module';

// Finance domain entities & module
import { FinancialLedgerEntry } from './finance/entities/financial-ledger-entry.entity';
import { CommissionConfig } from './finance/entities/commission-config.entity';
import { SettlementPeriod } from './finance/entities/settlement-period.entity';
import { DailyFinancialSnapshot } from './finance/entities/daily-financial-snapshot.entity';
import { FinancialTransaction } from './finance/entities/financial-transaction.entity';
import { FinanceModule } from './finance/finance.module';


@Module({
  imports: [
    AppCacheModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 minute window
      limit: 120,   // Safe for MVP traffic
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
        OrderHistory, RiderReview, Setting, Brand, Banner, Restaurant, MenuItem, SubOrder, BusinessReview,
        Vendor, VendorProduct, Favorite, OrderChatMessage,
        Coupon,
        Wallet, WalletTransaction, WalletSettlement, WithdrawalRequest,
        // Pharma domain
        Medicine, MedicineReview, Pharmacy, PharmacyMedicine, PharmacyInventory, Prescription, PrescriptionQuotation,
        MedicineSubstitution, PharmaComplianceLog, PharmaRecurringOrder,
        MedicineReminder, RefillReminder,
        Doctor, Consultation, LabTest, LabBooking,
        DoctorAvailability, LabAvailability,
        Clinic, DoctorClinic, AvailabilityTemplate,
        ModuleEvent,
        // CMS entities
        Tenant, TenantUser, ChangeRequest, ChangeRequestDiscussion, ApprovalRule, AuditLog,
        // Finance entities
        FinancialLedgerEntry, CommissionConfig, SettlementPeriod, DailyFinancialSnapshot, FinancialTransaction,
      ],
      logging: false,
      synchronize: process.env.NODE_ENV !== 'production',
      extra: {
        max: 80,
      },
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
    VendorsModule,
    FavoritesModule,
    WalletsModule,
    HomeModule,
    PharmaModule,
    ModuleEventsModule,
    CmsModule,
    FinanceModule,
    CouponsModule,
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
