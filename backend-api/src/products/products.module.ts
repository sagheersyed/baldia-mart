import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsGateway } from './products.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [ProductsService, ProductsGateway],
  controllers: [ProductsController],
  exports: [ProductsService, ProductsGateway],
})
export class ProductsModule {}
