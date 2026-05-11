import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pharma/medicines')
export class MedicinesController {
  constructor(
    private readonly medicinesService: MedicinesService,
    private readonly pharmaciesService: PharmaciesService,
  ) {}

  @Get('search')
  search(
    @Query('q') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('otcOnly') otcOnly?: string,
    @Query('isEmergency') isEmergency?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.medicinesService.search({
      query,
      categoryId,
      brandId,
      otcOnly: otcOnly === 'true',
      isEmergency: isEmergency === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 50) : 20,
    });
  }

  @Get('featured')
  featured(@Query('limit') limit?: string) {
    return this.medicinesService.getFeatured(limit ? parseInt(limit, 10) : 12);
  }

  @Get('emergency')
  emergency(@Query('limit') limit?: string) {
    return this.medicinesService.getEmergency(limit ? parseInt(limit, 10) : 20);
  }

  @Get('categories')
  categories() {
    return this.medicinesService.getCategories();
  }

  @Get('brands')
  brands() {
    return this.medicinesService.getBrands();
  }

  @Get('category/:categoryId')
  byCategory(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.medicinesService.getByCategory(
      categoryId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicinesService.findById(id);
  }

  @Get(':id/availability')
  async getAvailability(
    @Param('id') id: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const pharmacy = await this.pharmaciesService.findBestPharmacy(
      id, 
      1, 
      lat ? parseFloat(lat) : undefined, 
      lng ? parseFloat(lng) : undefined
    );
    return {
      available: !!pharmacy,
      pharmacy: pharmacy ? {
        id: pharmacy.id,
        name: pharmacy.name,
        isOpen: pharmacy.isOpen,
      } : null,
    };
  }

  // ── Admin Endpoints ───────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: any) {
    return this.medicinesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.medicinesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deactivate(@Param('id') id: string) {
    return this.medicinesService.deactivate(id);
  }
}
