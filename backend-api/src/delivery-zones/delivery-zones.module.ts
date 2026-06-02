import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryZone } from './delivery-zone.entity';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryZonesController } from './delivery-zones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryZone])],
  controllers: [DeliveryZonesController],
  providers: [DeliveryZonesService],
  exports: [DeliveryZonesService],
})
export class DeliveryZonesModule {}
