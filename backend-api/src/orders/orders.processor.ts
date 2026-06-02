import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OrdersService } from './orders.service';

@Processor('orders')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);
  private ordersService: OrdersService;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async onModuleInit() {
    this.ordersService = this.moduleRef.get(OrdersService, { strict: false });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'dispatch_order':
        const { orderId } = job.data;
        this.logger.log(`[Queue] Starting targeted dispatch for Order #${orderId}`);
        await this.ordersService.processDispatch(orderId);
        break;

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
