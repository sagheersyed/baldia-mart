import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleEvent } from './module-event.entity';
import { ModuleEventsService } from './module-events.service';
import { ModuleEventsController } from './module-events.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModuleEvent]),
    forwardRef(() => OrdersModule),
  ],
  providers: [ModuleEventsService],
  controllers: [ModuleEventsController],
  exports: [ModuleEventsService],
})
export class ModuleEventsModule {}
