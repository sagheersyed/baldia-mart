import { 
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';
import { LabService } from './lab.service';
import { LabBookingStatus } from './lab-booking.entity';

@Controller('pharma/lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  // ── Public/User Endpoints ─────────────────────────────────────

  @Get('tests')
  async getTests(@Query('category') category?: string) {
    return this.labService.getAllTests(category);
  }

  @Get('tests/:id')
  async getTest(@Param('id') id: string) {
    return this.labService.getTestById(id);
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  async createBooking(@GetUser('id') userId: string, @Body() dto: any) {
    return this.labService.createBooking(userId, dto);
  }

  @Get('bookings/my')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@GetUser('id') userId: string) {
    return this.labService.getMyBookings(userId);
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  async getBooking(@Param('id') id: string) {
    return this.labService.getBookingDetails(id);
  }

  // ── Admin Endpoints ───────────────────────────────────────────

  @Get('admin/bookings')
  @UseGuards(JwtAuthGuard)
  async getAllBookings(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.labService.getAllBookings(page, limit);
  }

  @Patch('admin/bookings/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string, 
    @Body('status') status: LabBookingStatus,
    @Body('reportUrl') reportUrl?: string
  ) {
    return this.labService.updateBookingStatus(id, status, reportUrl);
  }

  @Post('admin/tests')
  @UseGuards(JwtAuthGuard)
  async createTest(@Body() dto: any) {
    return this.labService.createTest(dto);
  }

  @Put('admin/tests/:id')
  @UseGuards(JwtAuthGuard)
  async updateTest(@Param('id') id: string, @Body() dto: any) {
    return this.labService.updateTest(id, dto);
  }

  @Delete('admin/tests/:id')
  @UseGuards(JwtAuthGuard)
  async deleteTest(@Param('id') id: string) {
    return this.labService.deleteTest(id);
  }

  // ── Availability ──────────────────────────────────────────────

  @Get('availability')
  async getAvailability(@Query('date') date?: string) {
    return this.labService.getAvailability(date);
  }

  @Post('admin/availability')
  @UseGuards(JwtAuthGuard)
  async addAvailability(@Body('slots') slots: any[]) {
    return this.labService.addAvailability(slots);
  }

  @Delete('admin/availability/:id')
  @UseGuards(JwtAuthGuard)
  async removeAvailability(@Param('id') id: string) {
    return this.labService.removeAvailability(id);
  }
}
