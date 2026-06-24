import { Controller, Post, Body, UseGuards, Request, Get, Put, Delete, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { Coupon } from './coupon.entity';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  /**
   * Admin: List all coupons
   */
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.couponsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  /**
   * Admin: Create coupon
   */
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  async create(@Body() body: Partial<Coupon>) {
    return this.couponsService.create(body);
  }

  /**
   * Admin: Update coupon
   */
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Partial<Coupon>) {
    return this.couponsService.update(id, body);
  }

  /**
   * Admin: Delete coupon
   */
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.delete(id);
  }

  /**
   * Public/User: Validate a coupon for checkout
   */
  @UseGuards(JwtAuthGuard)
  @Post('validate')
  async validate(
    @Request() req,
    @Body() body: { code: string; subtotal: number; vendorIds: string[] }
  ) {
    return this.couponsService.validateCoupon(
      req.user.id,
      body.code,
      body.subtotal,
      body.vendorIds
    );
  }
}
