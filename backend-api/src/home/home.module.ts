import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { Brand } from '../brands/brand.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { BannersModule } from '../banners/banners.module';
import { SettingsModule } from '../settings/settings.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Brand, Restaurant]),
    BannersModule,
    SettingsModule,
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}

