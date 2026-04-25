import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAllActive(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.productsService.findAllActive(page, limit);
  }

  @Get('category/:categoryId')
  async getByCategory(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findByCategory(categoryId, page, limit);
  }

  @Get('brand/:brandId')
  async getByBrand(
    @Param('brandId') brandId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findByBrand(brandId, page, limit);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async create(@Body() data: Partial<Product>) {
    return this.productsService.create(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async update(@Param('id') id: string, @Body() data: Partial<Product>) {
    return this.productsService.update(id, data);
  }

  /** Lightweight stock-only PATCH – faster cache invalidation path */
  @Patch(':id/stock')
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async updateStock(@Param('id') id: string, @Body('stockQuantity') stockQuantity: number) {
    return this.productsService.updateStock(id, stockQuantity);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
