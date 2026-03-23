import { Controller, Patch, Body, Req, UseGuards, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { RidersService } from './riders.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { Request } from 'express';

@Controller('riders')
@UseGuards(AuthGuard('jwt'))
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get('all')
  @UseGuards(AdminRoleGuard)
  async getAllRiders() {
    return this.ridersService.findAll();
  }

  @Patch('me')
  async updateProfile(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    
    console.log(`[DEBUG] Updating profile for rider ${user.id}:`, JSON.stringify(body, null, 2));

    const hasAllFields = !!(
      body.name && 
      body.vehicleType && 
      body.vehicleNumber && 
      body.cnicFrontUrl && 
      body.cnicBackUrl && 
      body.selfieUrl
    );

    if (hasAllFields) {
      body.isProfileComplete = true;
    }

    return this.ridersService.update(user.id, body);
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    const authUser = req.user as any;
    return this.ridersService.findById(authUser.id);
  }

  @Get('stats')
  async getStats(@Req() req: Request) {
    const authUser = req.user as any;
    return this.ridersService.getRiderStats(authUser.id);
  }

  @Get('me/earnings')
  async getEarnings(@Req() req: Request) {
    const authUser = req.user as any;
    return this.ridersService.getMonthlyEarnings(authUser.id);
  }

  @Patch(':id/status')
  @UseGuards(AdminRoleGuard)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive?: boolean; isProfileComplete?: boolean }
  ) {
    return this.ridersService.updateStatus(id, body);
  }

  @Patch(':id')
  @UseGuards(AdminRoleGuard)
  async updateRiderByAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRiderDto
  ) {
    return this.ridersService.update(id, body);
  }

  @Post(':id/reviews')
  async postReview(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) riderId: string,
    @Body() body: { rating: number; comment?: string; orderId: string }
  ) {
    const user = req.user as any;
    return this.ridersService.createReview({
      riderId,
      userId: user.id,
      orderId: body.orderId,
      rating: body.rating,
      comment: body.comment
    });
  }

  @Get('reviews/all')
  @UseGuards(AdminRoleGuard)
  async getAllReviews() {
    return this.ridersService.findAllReviews();
  }
}
