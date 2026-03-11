import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getAllActive() {
    return this.categoriesService.findAllActive();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  async create(@Body() data: Partial<Category>) {
    return this.categoriesService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Category>) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
