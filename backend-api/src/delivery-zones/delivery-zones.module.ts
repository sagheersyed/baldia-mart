import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryZone } from './delivery-zone.entity';
import { DeliveryZonesService } from './delivery-zones.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryZone])],
  providers: [DeliveryZonesService],
  exports: [DeliveryZonesService],
})
export class DeliveryZonesModule {}
