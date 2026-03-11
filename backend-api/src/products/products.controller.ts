import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAllActive() {
    return this.productsService.findAllActive();
  }

  @Get('category/:categoryId')
  async getByCategory(@Param('categoryId') categoryId: string) {
    return this.productsService.findByCategory(categoryId);
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
