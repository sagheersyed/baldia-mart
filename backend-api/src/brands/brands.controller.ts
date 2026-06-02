import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Inject, forwardRef } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { OrdersGateway } from '../orders/orders.gateway';

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  @Get()
  findAll(@Query('section') section?: string) {
    return this.brandsService.findAll(section);
  }

  /**
   * GET /brands/search?q=&section=&page=&limit=
   * Powers the global search screen and discovery flows on mobile.
   */
  @Get('search')
  search(
    @Query('q') q: string,
    @Query('section') section?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.brandsService.search(q || '', section, isNaN(p) ? 1 : p, isNaN(l) ? 20 : l);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async create(@Body() data: CreateBrandDto) {
    const result = await this.brandsService.create(data);
    this.ordersGateway.emitPharmaUpdated();
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async update(@Param('id') id: string, @Body() data: UpdateBrandDto) {
    const result = await this.brandsService.update(id, data);
    this.ordersGateway.emitPharmaUpdated();
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async remove(@Param('id') id: string) {
    const result = await this.brandsService.remove(id);
    this.ordersGateway.emitPharmaUpdated();
    return result;
  }
}
