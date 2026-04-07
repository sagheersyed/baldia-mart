import { Controller, Post, Get, Put, Body, Req, Param, UseGuards, BadRequestException, ParseUUIDPipe, Delete, Patch, ForbiddenException, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignRiderDto } from './dto/assign-rider.dto';
import { AddItemToOrderDto } from './dto/add-item-to-order.dto';
import { Request } from 'express';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('all')
  @UseGuards(AdminRoleGuard)
  async getAllOrders() {
    return this.ordersService.getAllOrdersForAdmin();
  }

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
  async getHistory(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const user = req.user as any;
    return this.ordersService.getOrderHistory(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  @Get('history/rider')
  async getRiderHistory(@Req() req: Request) {
    const user = req.user as any;
    if (user.role !== 'rider') throw new BadRequestException('Only riders can access rider history');
    return this.ordersService.getRiderOrderHistory(user.id);
  }

  @Post('checkout')
  async placeOrder(@Req() req: Request, @Body() body: PlaceOrderDto) {
    const user = req.user as any;
    return this.ordersService.placeOrder(
      user.id,
      body.addressId,
      body.paymentMethod,
      body.notes,
      body.items,
      body.orderType,
      body.restaurantId
    );
  }

  @Get('preview-fee/:addressId')
  async previewFee(
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Query('restaurantId') restaurantId?: string
  ) {
    return this.ordersService.calculateDeliveryFee(addressId, restaurantId);
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
  @UseGuards(AdminRoleGuard)
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, body.status);
  }

  @Put(':id/assign')
  @UseGuards(AdminRoleGuard)
  async assignRider(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() body: AssignRiderDto
  ) {
    return this.ordersService.assignRider(id, body.riderId);
  }

  @Post(':id/cancel')
  async cancelOrder(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as any;
    return this.ordersService.cancelOrder(id, user.id);
  }

  /**
   * Rider-only: progress an order through rider-controlled statuses.
   * Admins use PUT /:id/status for full control.
   */
  @Patch(':id/rider-status')
  async updateRiderStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    const user = req.user as any;
    if (user.role !== 'rider') {
      throw new ForbiddenException('Only riders can use this endpoint.');
    }
    // Allowed rider transitions: preparing → out_for_delivery → delivered
    const riderAllowedStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    if (!riderAllowedStatuses.includes(status)) {
      throw new BadRequestException(`Riders cannot set status to "${status}". Allowed: ${riderAllowedStatuses.join(', ')}`);
    }
    return this.ordersService.updateStatus(id, status);
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

  @Post(':id/items')
  async addItemToOrder(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddItemToOrderDto
  ) {
    const user = req.user as any;
    return this.ordersService.addItemToOrder(id, user.id, body.productId, body.quantity);
  }
  @Patch('sub-orders/:subOrderId/status')
  async updateSubOrderStatus(
    @Param('subOrderId', ParseUUIDPipe) subOrderId: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateSubOrderStatus(subOrderId, status);
  }
}
