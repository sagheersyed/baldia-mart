import { Controller, Patch, Body, Req, UseGuards, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { RidersService } from './riders.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('riders')
@UseGuards(AuthGuard('jwt'))
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get('all')
  // TODO: Add AdminRoleGuard later
  async getAllRiders() {
    return this.ridersService.findAll();
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive?: boolean; isProfileComplete?: boolean }
  ) {
    return this.ridersService.updateStatus(id, body);
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

  @Patch('me')
  async updateProfile(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    
    console.log(`[DEBUG] Updating profile for rider ${user.id}:`, JSON.stringify(body, null, 2));

    // Determine if we should mark profile as complete based on minimum required fields
    const hasAllFields = !!(
      body.name && 
      body.vehicleType && 
      body.vehicleNumber && 
      body.cnicFrontUrl && 
      body.cnicBackUrl && 
      body.selfieUrl
    );

    console.log(`[DEBUG] Rider ${user.id} has all required fields: ${hasAllFields}`);

    if (hasAllFields) {
      body.isProfileComplete = true;
      console.log(`[DEBUG] Marking profile as COMPLETE for rider ${user.id}`);
    }

    const updatedRider = await this.ridersService.update(user.id, body);
    console.log(`[DEBUG] Profile updated result for ${user.id}. isProfileComplete: ${updatedRider?.isProfileComplete}`);
    
    return updatedRider;
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
  async getAllReviews() {
    return this.ridersService.findAllReviews();
  }
}
