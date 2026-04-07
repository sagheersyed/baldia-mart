import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAllActive(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.productsService.findAllActive(page, limit);
  }

  @Get('category/:categoryId')
  async getByCategory(@Param('categoryId') categoryId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.productsService.findByCategory(categoryId, page, limit);
  }

  @Get('brand/:brandId')
  async getByBrand(@Param('brandId') brandId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.productsService.findByBrand(brandId, page, limit);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  async create(@Body() data: Partial<Product>) {
    return this.productsService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Product>) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
