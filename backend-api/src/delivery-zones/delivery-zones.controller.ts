import { Controller, Get, Post, Put, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';

@Controller(['delivery-zones', 'zones'])
export class DeliveryZonesController {
  constructor(private readonly zonesService: DeliveryZonesService) {}

  @Get('all')
  // TODO: Add AdminRoleGuard
  async getAllZones() {
    return this.zonesService.findAll();
  }

  @Get('active')
  async getActiveZones() {
    return this.zonesService.findAllActive();
  }

  @Post()
  async createZone(@Body() body: any) {
    return this.zonesService.create(body);
  }

  @Put(':id')
  async updateZone(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.zonesService.update(id, body);
  }

  @Put(':id/toggle')
  async toggleZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.toggleActive(id);
  }
}
