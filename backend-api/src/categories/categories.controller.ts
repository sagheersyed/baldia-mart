import { Controller, Get, Post, Put, Delete, Body, Param, Query, Inject, forwardRef } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { OrdersGateway } from '../orders/orders.gateway';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  @Get()
  async getAllActive(@Query('section') section?: string) {
    return this.categoriesService.findAllActive(section);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  async create(@Body() data: Partial<Category>) {
    const result = await this.categoriesService.create(data);
    this.ordersGateway.emitPharmaUpdated();
    return result;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Category>) {
    const result = await this.categoriesService.update(id, data);
    this.ordersGateway.emitPharmaUpdated();
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.categoriesService.remove(id);
    this.ordersGateway.emitPharmaUpdated();
    return result;
  }
}
