import { Controller, Post, Get, Put, Body, Req, Param, UseGuards, BadRequestException, ParseUUIDPipe, Delete, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('pending')
  async getPendingOrders(@Req() req: Request) {
    const user = req.user as any;
    if (user.role !== 'rider') throw new BadRequestException('Only riders can access pending orders');
    return this.ordersService.getPendingOrders();
  }

  @Get('active')
  async getActiveOrders(@Req() req: Request) {
    const user = req.user as any;
    if (user.role !== 'rider') throw new BadRequestException('Only riders can access active orders');
    return this.ordersService.getActiveOrdersForRider(user.id);
  }

  @Get('history')
  async getHistory(@Req() req: Request) {
    const user = req.user as any;
    return this.ordersService.getOrderHistory(user.id);
  }

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

  @Post(':id/accept')
  async acceptOrder(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as any;
    if (user.role !== 'rider') throw new BadRequestException('Only riders can accept orders');
    return this.ordersService.acceptOrder(id, user.id);
  }

  @Get(':id')
  async getOrder(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as any;
    return this.ordersService.getOrderById(id, user.id, user.role);
  }

  @Get(':id/timeline')
  async getOrderTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrderStatusTimeline(id);
  }

  @Put(':id/status')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Post(':id/cancel')
  async cancelOrder(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as any;
    return this.ordersService.cancelOrder(id, user.id);
  }

  @Post(':id/reorder')
  async reorderOrder(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as any;
    return this.ordersService.reorderOrder(id, user.id);
  }

  @Delete(':id/items/:itemId')
  async removeItem(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string
  ) {
    const user = req.user as any;
    return this.ordersService.removeOrderItem(orderId, itemId, user.id);
  }

  @Patch(':id/items')
  async batchUpdateItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('items') items: { itemId: string; quantity: number }[],
  ) {
    return this.ordersService.batchUpdateItems(id, items);
  }
}
