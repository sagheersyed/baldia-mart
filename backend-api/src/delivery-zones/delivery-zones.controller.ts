import { Controller, Get, Post, Put, Param, Body, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Controller(['delivery-zones', 'zones'])
export class DeliveryZonesController {
  constructor(private readonly zonesService: DeliveryZonesService) {}

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getAllZones() {
    return this.zonesService.findAll();
  }

  @Get('active')
  async getActiveZones() {
    return this.zonesService.findAllActive();
  }

  @Get('validate')
  async validateLocation(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    return this.zonesService.validateAddressInZone(Number(lat), Number(lng));
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async createZone(@Body() body: CreateDeliveryZoneDto) {
    return this.zonesService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async updateZone(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateDeliveryZoneDto) {
    return this.zonesService.update(id, body);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async toggleZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.toggleActive(id);
  }
}
