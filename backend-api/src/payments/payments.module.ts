import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Order } from '../orders/order.entity';
import { OrderHistory } from '../orders/order-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, OrderHistory]),
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
