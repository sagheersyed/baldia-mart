import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private cacheService: CacheService,
  ) {}

  async findAllActive(section?: string): Promise<Category[]> {
    const cacheKey = `categories:active:${section || 'all'}`;
    const cached = await this.cacheService.get<Category[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true };
    if (section && section !== 'all') {
      where.section = section.toLowerCase();
    }
    const data = await this.categoryRepository.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    
    await this.cacheService.set(cacheKey, data, 3600); // Cache for 1 hour
    return data;
  }

  async findById(id: string): Promise<Category> {
    const cacheKey = `categories:${id}`;
    const cached = await this.cacheService.get<Category>(cacheKey);
    if (cached) return cached;

    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    
    await this.cacheService.set(cacheKey, category, 3600);
    return category;
  }

  async create(data: Partial<Category>): Promise<Category> {
    const category = this.categoryRepository.create(data);
    const saved = await this.categoryRepository.save(category);
    await this.cacheService.delPattern('home:*');
    await this.cacheService.delPattern('categories:*');
    return saved;
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const category = await this.findById(id);
    Object.assign(category, data);
    const saved = await this.categoryRepository.save(category);
    await this.cacheService.delPattern('home:*');
    await this.cacheService.delPattern('categories:*');
    return saved;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findById(id);
    category.isActive = false;
    await this.categoryRepository.save(category);
    await this.cacheService.delPattern('home:*');
    await this.cacheService.delPattern('categories:*');
  }
}
