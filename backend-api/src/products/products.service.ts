import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './product.entity';
import { CacheService } from '../cache/cache.service';
import { ProductsGateway } from './products.gateway';

const CACHE_TTL = 300; // 5 minutes
const SEARCH_TTL = 60; // 1 minute for search responses
const KEY_ALL = 'products:all';
const KEY_PAGE = (p: number, l: number) => `products:page:${p}:${l}`;
const KEY_CAT = (id: string) => `products:cat:${id}`;
const KEY_CAT_PAGE = (id: string, p: number, l: number) => `products:cat:${id}:${p}:${l}`;
const KEY_BRAND = (id: string) => `products:brand:${id}`;
const KEY_BRAND_PAGE = (id: string, p: number, l: number) => `products:brand:${id}:${p}:${l}`;
const KEY_ONE = (id: string) => `products:one:${id}`;

export type ProductSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'discount'
  | 'rating';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  deal?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private cacheService: CacheService,
    private productsGateway: ProductsGateway,
  ) {}

  // ── Invalidate all products-related cache keys ──
  private async invalidateAll(): Promise<void> {
    await this.cacheService.delPattern('products:*');
    // Home payloads also include products, invalidate them as well.
    await this.cacheService.delPattern('home:*');
  }

  // ─────────────────────────────────────────────────────────────
  // READ (with Redis cache)
  // ─────────────────────────────────────────────────────────────
  async findAllActive(page?: number, limit?: number): Promise<any> {
    if (page && limit) {
      const cacheKey = KEY_PAGE(Number(page), Number(limit));
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) { this.logger.debug(`Cache HIT: ${cacheKey}`); return cached; }

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const [data, total] = await this.productRepository.findAndCount({
        where: { isActive: true },
        relations: ['category', 'brand'],
        order: { createdAt: 'DESC' },
        take,
        skip,
      });
      const result = { data, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
      await this.cacheService.set(cacheKey, result, CACHE_TTL);
      return result;
    }

    const cached = await this.cacheService.get<Product[]>(KEY_ALL);
    if (cached) { this.logger.debug(`Cache HIT: ${KEY_ALL}`); return cached; }

    const data = await this.productRepository.find({
      where: { isActive: true },
      relations: ['category', 'brand'],
      order: { createdAt: 'DESC' },
    });
    await this.cacheService.set(KEY_ALL, data, CACHE_TTL);
    return data;
  }

  async findByCategory(categoryId: string, page?: number, limit?: number): Promise<any> {
    if (page && limit) {
      const cacheKey = KEY_CAT_PAGE(categoryId, Number(page), Number(limit));
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const [data, total] = await this.productRepository.findAndCount({
        where: { categoryId, isActive: true },
        relations: ['category', 'brand'],
        order: { createdAt: 'DESC' },
        take,
        skip,
      });
      const result = { data, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
      await this.cacheService.set(cacheKey, result, CACHE_TTL);
      return result;
    }

    const cacheKey = KEY_CAT(categoryId);
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached) return cached;

    const data = await this.productRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category', 'brand'],
      order: { createdAt: 'DESC' },
    });
    await this.cacheService.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findByBrand(brandId: string, page?: number, limit?: number): Promise<any> {
    if (page && limit) {
      const cacheKey = KEY_BRAND_PAGE(brandId, Number(page), Number(limit));
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const [data, total] = await this.productRepository.findAndCount({
        where: { brandId, isActive: true },
        relations: ['category', 'brand'],
        order: { createdAt: 'DESC' },
        take,
        skip,
      });
      const result = { data, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
      await this.cacheService.set(cacheKey, result, CACHE_TTL);
      return result;
    }

    const cacheKey = KEY_BRAND(brandId);
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached) return cached;

    const data = await this.productRepository.find({
      where: { brandId, isActive: true },
      relations: ['category', 'brand'],
      order: { createdAt: 'DESC' },
    });
    await this.cacheService.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findById(id: string): Promise<Product> {
    const cacheKey = KEY_ONE(id);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.cacheService.set(cacheKey, product, CACHE_TTL);
    return product;
  }

  // ─────────────────────────────────────────────────────────────
  // SEARCH + FILTERED LIST
  // ─────────────────────────────────────────────────────────────
  private buildBaseQuery(): SelectQueryBuilder<Product> {
    return this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.brand', 'brand')
      .where('p.isActive = :active', { active: true });
  }

  private applySort(qb: SelectQueryBuilder<Product>, sort: ProductSort = 'newest') {
    switch (sort) {
      case 'price_asc':
        qb.orderBy('p.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('p.price', 'DESC');
        break;
      case 'popular':
        qb.orderBy('p.soldCount', 'DESC').addOrderBy('p.rating', 'DESC');
        break;
      case 'discount':
        qb.orderBy('p.discount', 'DESC');
        break;
      case 'rating':
        qb.orderBy('p.rating', 'DESC').addOrderBy('p.ratingCount', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('p.createdAt', 'DESC');
    }
  }

  async list(query: ProductListQuery): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    const qb = this.buildBaseQuery();

    if (query.categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.brandId) qb.andWhere('p.brandId = :brandId', { brandId: query.brandId });
    if (typeof query.minPrice === 'number') qb.andWhere('p.price >= :minPrice', { minPrice: query.minPrice });
    if (typeof query.maxPrice === 'number') qb.andWhere('p.price <= :maxPrice', { maxPrice: query.maxPrice });
    if (query.inStock) qb.andWhere('p.stockQuantity > 0');
    if (query.featured) qb.andWhere('p.isFeatured = true');
    if (query.bestSeller) qb.andWhere('p.isBestSeller = true');
    if (query.deal) qb.andWhere('(p.isDeal = true OR p.discount > 0)');

    if (query.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(new Brackets(b => {
        b.where('LOWER(p.name) LIKE :term', { term })
         .orWhere('LOWER(p.description) LIKE :term', { term })
         .orWhere('LOWER(category.name) LIKE :term', { term })
         .orWhere('LOWER(brand.name) LIKE :term', { term });
      }));
    }

    this.applySort(qb, query.sort);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / Math.max(1, limit)),
    };
  }

  async search(q: string, page = 1, limit = 20): Promise<PaginatedResult<Product>> {
    const trimmed = (q || '').trim();
    if (!trimmed) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const cacheKey = `products:search:${trimmed.toLowerCase()}:${page}:${limit}`;
    const cached = await this.cacheService.get<PaginatedResult<Product>>(cacheKey);
    if (cached) return cached;

    const result = await this.list({ search: trimmed, page, limit, sort: 'popular' });
    await this.cacheService.set(cacheKey, result, SEARCH_TTL);
    return result;
  }

  async findFeatured(page = 1, limit = 20) {
    return this.list({ featured: true, page, limit, sort: 'popular' });
  }

  async findBestSellers(page = 1, limit = 20) {
    return this.list({ bestSeller: true, page, limit, sort: 'popular' });
  }

  async findDeals(page = 1, limit = 20) {
    return this.list({ deal: true, page, limit, sort: 'discount' });
  }

  async findNewest(page = 1, limit = 20) {
    return this.list({ page, limit, sort: 'newest' });
  }

  // ─────────────────────────────────────────────────────────────
  // WRITE (invalidate cache & emit WebSocket)
  // ─────────────────────────────────────────────────────────────
  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(data);
    const saved = await this.productRepository.save(product);

    await this.invalidateAll();
    this.productsGateway.emitProductsUpdated('created', { productId: saved.id });

    return saved;
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    Object.assign(product, data);
    const saved = await this.productRepository.save(product);

    await this.invalidateAll();
    this.productsGateway.emitProductsUpdated('updated', { productId: id });

    return saved;
  }

  /**
   * Patch only merchandising flags. Used by admin to toggle Featured / Best
   * Seller / Deal / sortOrder without reposting the full product.
   */
  async updateFlags(
    id: string,
    flags: {
      isFeatured?: boolean;
      isBestSeller?: boolean;
      isDeal?: boolean;
      sortOrder?: number;
      discountPercent?: number | null;
      tags?: string[] | null;
      unit?: string | null;
      weight?: string | null;
    },
  ): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (typeof flags.isFeatured === 'boolean') product.isFeatured = flags.isFeatured;
    if (typeof flags.isBestSeller === 'boolean') product.isBestSeller = flags.isBestSeller;
    if (typeof flags.isDeal === 'boolean') product.isDeal = flags.isDeal;
    if (typeof flags.sortOrder === 'number') product.sortOrder = flags.sortOrder;
    if (flags.discountPercent !== undefined) product.discountPercent = flags.discountPercent;
    if (flags.tags !== undefined) product.tags = flags.tags;
    if (flags.unit !== undefined) product.unit = flags.unit;
    if (flags.weight !== undefined) product.weight = flags.weight;

    const saved = await this.productRepository.save(product);

    await this.invalidateAll();
    this.productsGateway.emitProductsUpdated('updated', { productId: id });

    return saved;
  }

  /** Increment soldCount when an order item is created. */
  async incrementSoldCount(productId: string, byQty: number): Promise<void> {
    if (!productId || !byQty) return;
    try {
      await this.productRepository.increment({ id: productId } as any, 'soldCount', byQty);
      await this.cacheService.delPattern('home:*');
      await this.cacheService.del(KEY_ONE(productId));
    } catch (err: any) {
      this.logger.warn(`incrementSoldCount failed for ${productId}: ${err?.message || err}`);
    }
  }

  /** Update only stock quantity (fast path, emits stock_updated event) */
  async updateStock(id: string, stockQuantity: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    product.stockQuantity = stockQuantity;
    const saved = await this.productRepository.save(product);

    // Invalidate just this product's cache + the all-products cache
    await this.cacheService.del(KEY_ONE(id), KEY_ALL);
    await this.cacheService.delPattern(`products:cat:${product.categoryId}*`);
    await this.cacheService.delPattern('home:*');
    this.productsGateway.emitProductsUpdated('stock_updated', { productId: id, stock: stockQuantity });

    return saved;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    product.isActive = false;
    await this.productRepository.save(product);

    await this.invalidateAll();
    this.productsGateway.emitProductsUpdated('deleted', { productId: id });
  }
}
