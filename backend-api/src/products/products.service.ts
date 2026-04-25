import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CacheService } from '../cache/cache.service';
import { ProductsGateway } from './products.gateway';

const CACHE_TTL = 300; // 5 minutes
const KEY_ALL = 'products:all';
const KEY_PAGE = (p: number, l: number) => `products:page:${p}:${l}`;
const KEY_CAT = (id: string) => `products:cat:${id}`;
const KEY_CAT_PAGE = (id: string, p: number, l: number) => `products:cat:${id}:${p}:${l}`;
const KEY_BRAND = (id: string) => `products:brand:${id}`;
const KEY_BRAND_PAGE = (id: string, p: number, l: number) => `products:brand:${id}:${p}:${l}`;
const KEY_ONE = (id: string) => `products:one:${id}`;

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

  /** Update only stock quantity (fast path, emits stock_updated event) */
  async updateStock(id: string, stockQuantity: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    product.stockQuantity = stockQuantity;
    const saved = await this.productRepository.save(product);

    // Invalidate just this product's cache + the all-products cache
    await this.cacheService.del(KEY_ONE(id), KEY_ALL);
    await this.cacheService.delPattern(`products:cat:${product.categoryId}*`);
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
