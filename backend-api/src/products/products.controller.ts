import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ProductsService, ProductSort } from './products.service';
import { Product } from './product.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';

const parseBool = (v: any): boolean | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  return v === '1' || v === 'true' || v === true;
};

const parseNum = (v: any): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── Universal product list with filters & sort ─────────────────
  @Get()
  async list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('sort') sort?: ProductSort,
    @Query('minPrice') minPrice?: any,
    @Query('maxPrice') maxPrice?: any,
    @Query('inStock') inStock?: any,
    @Query('featured') featured?: any,
    @Query('bestSeller') bestSeller?: any,
    @Query('deal') deal?: any,
    @Query('ids') ids?: string,
  ) {
    const hasAdvancedQuery = Boolean(
      search || categoryId || brandId || sort ||
      minPrice !== undefined || maxPrice !== undefined ||
      inStock !== undefined || featured !== undefined ||
      bestSeller !== undefined || deal !== undefined || ids,
    );

    if (hasAdvancedQuery) {
      return this.productsService.list({
        page: parseNum(page) ?? 1,
        limit: parseNum(limit) ?? 20,
        search,
        categoryId,
        brandId,
        sort,
        minPrice: parseNum(minPrice),
        maxPrice: parseNum(maxPrice),
        inStock: parseBool(inStock),
        featured: parseBool(featured),
        bestSeller: parseBool(bestSeller),
        deal: parseBool(deal),
        ids,
      });
    }

    return this.productsService.findAllActive(page, limit);
  }

  // ── Discovery shortcuts (uniform paginated shape) ──────────────
  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.search(q || '', parseNum(page) ?? 1, parseNum(limit) ?? 20);
  }

  @Get('featured')
  async featured(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findFeatured(parseNum(page) ?? 1, parseNum(limit) ?? 20);
  }

  @Get('best-sellers')
  async bestSellers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findBestSellers(parseNum(page) ?? 1, parseNum(limit) ?? 20);
  }

  @Get('deals')
  async deals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findDeals(parseNum(page) ?? 1, parseNum(limit) ?? 20);
  }

  @Get('newest')
  async newest(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findNewest(parseNum(page) ?? 1, parseNum(limit) ?? 20);
  }

  // ── Existing routes (backward compatible) ──────────────────────
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

  // ── Admin-only: full inventory for vendor product pickers (no cache, no isActive filter) ──
  @Get('all')
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async listAll() {
    return this.productsService.findAllForAdmin();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  // ── Admin write endpoints ──────────────────────────────────────
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

  /** Toggle merchandising flags (Featured / Best Seller / Deal / sortOrder) */
  @Patch(':id/flags')
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async updateFlags(
    @Param('id') id: string,
    @Body() body: {
      isFeatured?: boolean;
      isBestSeller?: boolean;
      isDeal?: boolean;
      sortOrder?: number;
      discountPercent?: number | null;
      tags?: string[] | null;
      unit?: string | null;
      weight?: string | null;
    },
  ) {
    return this.productsService.updateFlags(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminRoleGuard)
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
