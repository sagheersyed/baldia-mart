import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // Public - any user/app can fetch active banners
  @Get()
  findAll(
    @Query('section') section?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.bannersService.findAll(section, zoneId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }


  // Admin only - create/update/delete
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  create(@Body() data: CreateBannerDto) {
    return this.bannersService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() data: UpdateBannerDto) {
    return this.bannersService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
