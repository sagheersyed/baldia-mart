import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PharmaciesService } from './pharmacies.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pharma/pharmacies')
export class PharmaciesController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  @Get()
  getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pharmaciesService.getAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.pharmaciesService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 5,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmaciesService.findById(id);
  }

  @Get(':id/inventory')
  getInventory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pharmaciesService.getInventory(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post(':id/inventory')
  @UseGuards(JwtAuthGuard)
  addInventory(@Param('id') id: string, @Body() dto: any) {
    return this.pharmaciesService.addInventoryItem(id, dto);
  }

  @Delete('inventory/:id')
  @UseGuards(JwtAuthGuard)
  removeInventory(@Param('id') id: string) {
    return this.pharmaciesService.removeInventoryItem(id);
  }

  // ── Onboarding ────────────────────────────────────────────────

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(@Body() dto: any) {
    return this.pharmaciesService.register(dto);
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Param('id') id: string) {
    return this.pharmaciesService.approvePharmacy(id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.pharmaciesService.rejectPharmacy(id, reason);
  }

  // ── Expiry Management ─────────────────────────────────────────

  @Get('admin/near-expiry')
  @UseGuards(JwtAuthGuard)
  nearExpiry(@Query('days') days?: string) {
    return this.pharmaciesService.getNearExpiry(days ? parseInt(days, 10) : 30);
  }
}
