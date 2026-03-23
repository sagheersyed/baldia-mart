import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusinessReviewsService } from './business-reviews.service';
import { Request } from 'express';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('business-reviews')
export class BusinessReviewsController {
  constructor(private readonly reviewsService: BusinessReviewsService) {}
  
  @Get('test')
  test() {
    return { message: 'Business reviews controller is active' };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    return this.reviewsService.create({
      userId: user.id,
      orderId: body.orderId,
      subOrderId: body.subOrderId,
      businessId: body.businessId,
      businessType: body.businessType,
      rating: body.rating,
      comment: body.comment,
    });
  }

  @Get('all')
  @UseGuards(AdminRoleGuard)
  async getAll() {
    return this.reviewsService.findAll();
  }
}
