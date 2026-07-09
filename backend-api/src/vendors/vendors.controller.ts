import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Patch, Query,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorProductDto } from './dto/vendor-product.dto';

@Controller('vendors')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.vendorsService.findAll(all === 'true');
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
  create(@Body() body: CreateVendorDto) {
    return this.vendorsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateVendorDto) {
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
    @Body() body: VendorProductDto,
  ) {
    return this.vendorsService.addProductToVendor(
      vendorId, body.productId, body.price, body.stockQty,
    );
  }

  @Put(':id/products/:productId')
  updateProduct(
    @Param('id') vendorId: string,
    @Param('productId') productId: string,
    @Body() body: Partial<VendorProductDto>,
  ) {
    return this.vendorsService.updateVendorProduct(vendorId, productId, body);
  }
}
