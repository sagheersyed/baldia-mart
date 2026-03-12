import { Controller, Post, Get, Put, Body, Req, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  async placeOrder(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    return this.ordersService.placeOrder(
      user.id,
      body.addressId,
      body.paymentMethod,
      body.notes,
      body.items
    );
  }

  @Get('history')
  async getHistory(@Req() req: Request) {
    const user = req.user as any;
    return this.ordersService.getOrderHistory(user.id);
  }

  @Get(':id')
  async getOrder(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.ordersService.getOrderById(id, user.id);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Post(':id/cancel')
  async cancelOrder(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.ordersService.cancelOrder(id, user.id);
  }

  @Post(':id/reorder')
  async reorderOrder(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.ordersService.reorderOrder(id, user.id);
  }
}
