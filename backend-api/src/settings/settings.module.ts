import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SettingsGateway } from './settings.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsGateway],
  exports: [SettingsService],
})
export class SettingsModule {}
