import { Controller, Post, Get, Patch, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { RashanService } from './rashan.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { Request } from 'express';
import { SubmitRashanOrderDto } from './dto/submit-rashan-order.dto';
import { SetRashanQuotationDto } from './dto/set-rashan-quotation.dto';
import { RejectRashanOrderDto } from './dto/reject-rashan-order.dto';
import { MarkRashanSourcingDto } from './dto/mark-rashan-sourcing.dto';
import { RashanFeePreviewDto } from './dto/rashan-fee-preview.dto';

@Controller('orders/rashan')
@UseGuards(AuthGuard('jwt'))
export class RashanController {
  constructor(private readonly rashanService: RashanService) {}

  /**
   * User: Submit a new monthly rashan bulk order.
   */
  @Post()
  async submitRequest(@Req() req: Request, @Body() body: SubmitRashanOrderDto) {
    const user = req.user as any;
    return this.rashanService.submitRequest(user.id, body);
  }

  /**
   * User: Get my rashan orders.
   */
  @Get('my')
  async getMyOrders(@Req() req: Request) {
    const user = req.user as any;
    return this.rashanService.getForUser(user.id);
  }

  /**
   * Admin: Get all rashan orders.
   */
  @Get('all')
  @UseGuards(AdminRoleGuard)
  async getAllForAdmin() {
    return this.rashanService.getAllForAdmin();
  }

  /**
   * User: Get a specific rashan order.
   */
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rashanService.getById(id);
  }

  /**
   * Admin: Set a quotation with separate product and logistics components.
   */
  @Patch(':id/quote')
  @UseGuards(AdminRoleGuard)
  async setQuotation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetRashanQuotationDto,
  ) {
    return this.rashanService.setQuotation(id, body.productTotal, body.deliveryFeeOverride);
  }

  /**
   * Admin: Reject the order with a reason.
   */
  @Patch(':id/reject')
  @UseGuards(AdminRoleGuard)
  async rejectOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectRashanOrderDto,
  ) {
    return this.rashanService.rejectOrder(id, body.reason);
  }

  /**
   * User: Approve the admin's quotation.
   */
  @Patch(':id/approve')
  async approveQuotation(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = req.user as any;
    return this.rashanService.approveQuotation(id, user.id);
  }

  /**
   * Admin: Mark as sourcing and optionally assign a rider.
   */
  @Patch(':id/sourcing')
  @UseGuards(AdminRoleGuard)
  async markSourcing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MarkRashanSourcingDto,
  ) {
    return this.rashanService.markSourcing(id, body.riderId);
  }

  /**
   * Admin/Rider: Mark as delivered.
   */
  @Patch(':id/delivered')
  @UseGuards(AdminRoleGuard)
  async markDelivered(@Param('id', ParseUUIDPipe) id: string) {
    return this.rashanService.markDelivered(id);
  }

  /**
   * User: Cancel request.
   */
  @Patch(':id/cancel')
  async cancelRequest(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = req.user as any;
    return this.rashanService.cancelRequest(id, user.id);
  }

  /**
   * Utility: Preview service fee before submitting.
   */
  @Post('fee-preview')
  async previewFee(@Body() body: RashanFeePreviewDto) {
    const fee = await this.rashanService.calculateServiceFee(body.weightTier, body.floor, body.placement);
    return { serviceFee: fee };
  }
}
