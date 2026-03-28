import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './vendor.entity';
import { VendorProduct } from './vendor-product.entity';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, VendorProduct])],
  providers: [VendorsService],
  controllers: [VendorsController],
  exports: [VendorsService],
})
export class VendorsModule {}
