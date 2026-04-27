import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Brand } from './brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
  ) {}

  async findAll(section?: string): Promise<Brand[]> {
    const where: any = { isActive: true };
    if (section && section !== 'all') {
      where.section = section.toLowerCase();
    }
    return this.brandRepository.find({ where, order: { name: 'ASC' } });
  }

  /**
   * Lightweight brand/store search for the global search screen.
   * Matches name, category, and description.
   */
  async search(query: string, section?: string, page = 1, limit = 20): Promise<{ data: Brand[]; total: number; page: number; limit: number }> {
    const q = (query || '').trim();
    const take = Math.max(1, Math.min(50, limit));
    const skip = Math.max(0, (page - 1) * take);
    const sectionFilter = section && section !== 'all' ? section.toLowerCase() : undefined;

    if (!q) {
      const where: any = { isActive: true };
      if (sectionFilter) where.section = sectionFilter;
      const [data, total] = await this.brandRepository.findAndCount({
        where,
        order: { rating: 'DESC', name: 'ASC' },
        take,
        skip,
      });
      return { data, total, page, limit: take };
    }

    const wildcard = `%${q}%`;
    const baseFilters = [
      { isActive: true, name: ILike(wildcard) } as any,
      { isActive: true, category: ILike(wildcard) } as any,
      { isActive: true, description: ILike(wildcard) } as any,
    ];
    const where = sectionFilter
      ? baseFilters.map((f) => ({ ...f, section: sectionFilter }))
      : baseFilters;

    const [data, total] = await this.brandRepository.findAndCount({
      where,
      order: { rating: 'DESC', name: 'ASC' },
      take,
      skip,
    });
    return { data, total, page, limit: take };
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(data: Partial<Brand>): Promise<Brand> {
    const brand = this.brandRepository.create(data);
    return this.brandRepository.save(brand);
  }

  async update(id: string, data: Partial<Brand>): Promise<Brand> {
    const brand = await this.findOne(id);
    Object.assign(brand, data);
    return this.brandRepository.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    brand.isActive = false;
    await this.brandRepository.save(brand);
  }
}
