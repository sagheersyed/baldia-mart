import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { BannersGateway } from './banners.gateway';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    SettingsModule
  ],
  controllers: [BannersController],
  providers: [BannersService, BannersGateway],
  exports: [BannersService],
})
export class BannersModule {}
