import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

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
  create(@Body() data: CreateBrandDto) {
    return this.brandsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() data: UpdateBrandDto) {
    return this.brandsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
