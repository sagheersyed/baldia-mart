import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get()
  findAll(
    @Query('restaurantId') restaurantId?: string,
    @Query('search') search?: string,
    @Query('ids') ids?: string,
  ) {
    if (ids) {
      const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
      return this.menuItemsService.findByIds(idList);
    }
    if (search) {
      return this.menuItemsService.search(search);
    }
    if (restaurantId) {
      return this.menuItemsService.findByRestaurant(restaurantId);
    }
    return this.menuItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  create(@Body() data: CreateMenuItemDto) {
    return this.menuItemsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() data: UpdateMenuItemDto) {
    return this.menuItemsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }
}
