import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Patch,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Get(':id/products')
  getProducts(@Param('id') id: string) {
    return this.vendorsService.getVendorProducts(id);
  }

  // Admin: manage vendors
  @Post()
  create(@Body() body: any) {
    return this.vendorsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.vendorsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }

  // Admin: vendor product catalog
  @Post(':id/products')
  addProduct(
    @Param('id') vendorId: string,
    @Body() body: { productId: string; price: number; stockQty: number },
  ) {
    return this.vendorsService.addProductToVendor(
      vendorId, body.productId, body.price, body.stockQty,
    );
  }

  @Put(':id/products/:productId')
  updateProduct(
    @Param('id') vendorId: string,
    @Param('productId') productId: string,
    @Body() body: any,
  ) {
    return this.vendorsService.updateVendorProduct(vendorId, productId, body);
  }
}
