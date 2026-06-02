import { Controller, Post, Get, Body, UseGuards, Param, Query, Req, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PharmaOrdersService } from './pharma-orders.service';
import { ControlledSubstanceInterceptor } from '../compliance/controlled-substance.interceptor';

@Controller('pharma/orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ControlledSubstanceInterceptor)
export class PharmaOrdersController {
  constructor(private readonly pharmaOrdersService: PharmaOrdersService) {}

  @Post()
  async placeOrder(
    @Req() req: any,
    @Body() dto: {
      addressId: string;
      items: { medicineId: string; quantity: number }[];
      prescriptionId?: string;
      paymentMethod: string;
      notes?: string;
    },
  ) {
    return this.pharmaOrdersService.placeOrder(req.user.id, dto);
  }

  @Get('my')
  async getMyOrders(@Req() req: any) {
    return this.pharmaOrdersService.getMyOrders(req.user.id);
  }

  @Get(':id')
  async getOrderDetails(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.pharmaOrdersService.getOrderDetails(req.user.id, id);
  }
}
