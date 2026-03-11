import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rider } from './rider.entity';
// import { RidersService } from './riders.service';
// import { RidersController } from './riders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Rider])],
  providers: [], // RidersService
  controllers: [], // RidersController
  exports: [],
})
export class RidersModule {}
