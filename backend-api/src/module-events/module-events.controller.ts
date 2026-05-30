import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ModuleEventsService } from './module-events.service';
import { ModuleEvent } from './module-event.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('module-events')
export class ModuleEventsController {
  constructor(private readonly moduleEventsService: ModuleEventsService) {}

  @Get()
  async findAll(
    @Query('section') section?: string,
    @Query('admin') admin?: string,
  ) {
    const isAdmin = admin === 'true';
    return this.moduleEventsService.findAll(section, isAdmin);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.moduleEventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async create(@Body() data: Partial<ModuleEvent>) {
    return this.moduleEventsService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async update(@Param('id') id: string, @Body() data: Partial<ModuleEvent>) {
    return this.moduleEventsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async remove(@Param('id') id: string) {
    return this.moduleEventsService.remove(id);
  }
}
