import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { Brand } from '../brands/brand.entity';
import { BannersService } from '../banners/banners.service';
import { SettingsService } from '../settings/settings.service';
import { HomePayload, HomeSection } from './home.types';

const SECTION_LIMIT = 10;
const HOME_CACHE_TTL_SECONDS = 120;
const TOP_CATEGORY_SECTIONS = 4;
const BRAND_LIMIT = 12;

const homeCacheKey = (section: 'mart' | 'food', zoneId?: string | null) =>
  `home:${section}:zone:${zoneId || 'all'}`;

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Brand) private readonly brandsRepo: Repository<Brand>,
    private readonly bannersService: BannersService,
    private readonly settingsService: SettingsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Invalidate every cached home payload (any section / zone).
   * Called whenever products, banners, categories, or brands change.
   */
  async invalidateAll(): Promise<void> {
    await this.cacheService.delPattern('home:*');
  }

  async getHome(
    section: 'mart' | 'food',
    zoneId?: string | null,
  ): Promise<HomePayload> {
    const key = homeCacheKey(section, zoneId);
    const cached = await this.cacheService.get<HomePayload>(key);
    if (cached) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    const payload = await this.buildHome(section, zoneId);
    await this.cacheService.set(key, payload, HOME_CACHE_TTL_SECONDS);
    return payload;
  }

  // ─── private builders ─────────────────────────────────────────────

  private async buildHome(
    section: 'mart' | 'food',
    zoneId?: string | null,
  ): Promise<HomePayload> {
    const settings = await this.settingsService.getPublic();
    const rashanEnabled = settings.feature_rashan_enabled === true;

    const [banners, categories, brands] = await Promise.all([
      this.bannersService.findAll(section, zoneId || undefined).catch(() => []),
      this.fetchTopCategories(section),
      this.fetchTopBrands(section),
    ]);

    const sections: HomeSection[] = [];

    sections.push(await this.buildDealsSection());
    sections.push(await this.buildBestSellersSection());

    const topCategories = categories.slice(0, TOP_CATEGORY_SECTIONS);
    for (const cat of topCategories) {
      const catSection = await this.buildCategorySection(cat);
      if (catSection.products.length > 0) sections.push(catSection);
    }

    sections.push(await this.buildNewestSection());
    sections.push(await this.buildBudgetSection());

    const trending = this.collectTrending(sections);

    return {
      section,
      zoneId: zoneId || null,
      generatedAt: new Date().toISOString(),
      banners,
      categories,
      brands,
      rashanEnabled,
      trending,
      sections: sections.filter(s => Array.isArray(s.products) && s.products.length > 0),
    };
  }

  private async fetchTopCategories(section: 'mart' | 'food'): Promise<Category[]> {
    return this.categoriesRepo.find({
      where: {
        isActive: true,
        section: section === 'food' ? 'restaurant' : 'mart',
        parentCategoryId: null as any,
      },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      take: 24,
    });
  }

  private async fetchTopBrands(section: 'mart' | 'food'): Promise<Brand[]> {
    return this.brandsRepo.find({
      where: {
        isActive: true,
        section: section === 'food' ? 'restaurant' : 'mart',
      },
      order: { rating: 'DESC', name: 'ASC' },
      take: BRAND_LIMIT,
    });
  }

  private async buildDealsSection(): Promise<HomeSection> {
    const products = await this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.brand', 'brand')
      .where('p.isActive = :active', { active: true })
      .andWhere('(p.isDeal = true OR p.discount > 0)')
      .orderBy('p.sortOrder', 'ASC')
      .addOrderBy('p.discount', 'DESC')
      .take(SECTION_LIMIT)
      .getMany();

    return {
      id: 'flash-sale',
      title: 'Flash Sale',
      subtitle: 'Limited time deals',
      type: 'deals',
      layout: 'horizontal',
      viewAll: { type: 'deals' },
      products,
    };
  }

  private async buildBestSellersSection(): Promise<HomeSection> {
    const products = await this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.brand', 'brand')
      .where('p.isActive = :active', { active: true })
      .andWhere('(p.isBestSeller = true OR p.soldCount > 0)')
      .orderBy('p.isBestSeller', 'DESC')
      .addOrderBy('p.soldCount', 'DESC')
      .addOrderBy('p.rating', 'DESC')
      .take(SECTION_LIMIT)
      .getMany();

    return {
      id: 'best-sellers',
      title: 'Best Sellers',
      subtitle: 'Most loved by customers',
      type: 'best_sellers',
      layout: 'grid-2',
      viewAll: { type: 'best_sellers' },
      products,
    };
  }

  private async buildCategorySection(cat: Category): Promise<HomeSection> {
    const products = await this.productsRepo.find({
      where: { categoryId: cat.id, isActive: true },
      relations: ['category', 'brand'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      take: SECTION_LIMIT,
    });

    return {
      id: `category-${cat.id}`,
      title: cat.name,
      subtitle: cat.description || undefined,
      type: 'category',
      layout: 'horizontal',
      categoryId: cat.id,
      viewAll: { type: 'category', id: cat.id },
      products,
    };
  }

  private async buildNewestSection(): Promise<HomeSection> {
    const products = await this.productsRepo.find({
      where: { isActive: true },
      relations: ['category', 'brand'],
      order: { createdAt: 'DESC' },
      take: SECTION_LIMIT,
    });

    return {
      id: 'recently-added',
      title: 'Recently Added',
      subtitle: 'Just landed in store',
      type: 'newest',
      layout: 'horizontal',
      viewAll: { type: 'newest' },
      products,
    };
  }

  private async buildBudgetSection(): Promise<HomeSection> {
    const products = await this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.brand', 'brand')
      .where('p.isActive = :active', { active: true })
      .andWhere('(p.price - COALESCE(p.discount, 0)) <= :max', { max: 100 })
      .orderBy('p.price', 'ASC')
      .take(SECTION_LIMIT)
      .getMany();

    return {
      id: 'budget-picks',
      title: 'Budget Picks Under Rs 100',
      subtitle: 'Big savings, small price',
      type: 'budget',
      layout: 'horizontal',
      viewAll: { type: 'budget', maxPrice: 100 },
      products,
    };
  }

  private collectTrending(sections: HomeSection[]): string[] {
    const seen = new Set<string>();
    const trending: string[] = [];
    for (const section of sections) {
      for (const product of section.products) {
        if (!product?.name) continue;
        const key = product.name.split(' ').slice(0, 2).join(' ');
        if (key.length < 3) continue;
        if (seen.has(key.toLowerCase())) continue;
        seen.add(key.toLowerCase());
        trending.push(key);
        if (trending.length >= 8) return trending;
      }
    }
    return trending;
  }
}
