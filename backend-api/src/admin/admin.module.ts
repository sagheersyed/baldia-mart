import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SeedController } from './seed.controller';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Category, Product])],
  providers: [AdminService],
  controllers: [AdminController, SeedController],
  exports: [AdminService],
})
export class AdminModule {}
