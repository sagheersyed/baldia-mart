import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll() {
    return this.restaurantsService.findAll();
  }

  /**
   * GET /restaurants/search?q=&page=&limit=
   * Powers the global search screen on mobile.
   */
  @Get('search')
  search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.restaurantsService.search(q || '', isNaN(p) ? 1 : p, isNaN(l) ? 20 : l);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  create(@Body() data: CreateRestaurantDto) {
    return this.restaurantsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() data: UpdateRestaurantDto) {
    return this.restaurantsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }
}
