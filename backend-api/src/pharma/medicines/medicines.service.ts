import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Medicine } from './medicine.entity';
import { Category } from '../../categories/category.entity';
import { Brand } from '../../brands/brand.entity';

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
  ) {}

  /**
   * Search medicines with optional filters.
   * Uses ILIKE for name/generic search — will be backed by pg_trgm index.
   */
  async search(params: {
    query?: string;
    categoryId?: string;
    brandId?: string;
    otcOnly?: boolean;
    isEmergency?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { query, categoryId, brandId, otcOnly, isEmergency, page = 1, limit = 20 } = params;

    const qb = this.medicineRepo
      .createQueryBuilder('m')
      .where('m.isActive = :active', { active: true });

    if (query && query.trim().length >= 2) {
      qb.andWhere(
        '(m.name ILIKE :q OR m.genericName ILIKE :q OR m.composition ILIKE :q)',
        { q: `%${query.trim()}%` },
      );
    }

    if (categoryId) qb.andWhere('m.categoryId = :categoryId', { categoryId });
    if (brandId) qb.andWhere('m.brandId = :brandId', { brandId });
    if (otcOnly) qb.andWhere('m.isOtc = :otc', { otc: true });
    if (isEmergency) qb.andWhere('m.isEmergency = :emg', { emg: true });

    qb.orderBy('m.sortOrder', 'ASC')
      .addOrderBy('m.soldCount', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Medicine> {
    const medicine = await this.medicineRepo.findOne({ where: { id } });
    if (!medicine) throw new NotFoundException('Medicine not found');

    // Increment view count (fire-and-forget)
    this.medicineRepo.increment({ id }, 'viewCount', 1).catch(() => {});

    return medicine;
  }

  async findByIds(ids: string[]): Promise<Medicine[]> {
    if (!ids.length) return [];
    return this.medicineRepo.find({ where: { id: In(ids), isActive: true } });
  }

  async getFeatured(limit = 12): Promise<Medicine[]> {
    return this.medicineRepo.find({
      where: { isActive: true, isFeatured: true },
      order: { sortOrder: 'ASC', soldCount: 'DESC' },
      take: limit,
    });
  }

  async getEmergency(limit = 20): Promise<Medicine[]> {
    return this.medicineRepo.find({
      where: { isActive: true, isEmergency: true },
      order: { sortOrder: 'ASC' },
      take: limit,
    });
  }

  async getByCategory(categoryId: string, page = 1, limit = 20) {
    const [data, total] = await this.medicineRepo.findAndCount({
      where: { categoryId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getCategories() {
    return this.categoryRepo.find({
      where: { section: 'pharma', isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getBrands() {
    return this.brandRepo.find({
      where: { section: 'pharma', isActive: true },
      order: { name: 'ASC' },
    });
  }

  // ── Admin CRUD ────────────────────────────────────────────────

  async create(dto: Partial<Medicine>): Promise<Medicine> {
    const medicine = this.medicineRepo.create(dto);
    return this.medicineRepo.save(medicine);
  }

  async update(id: string, dto: Partial<Medicine>): Promise<Medicine> {
    const medicine = await this.findById(id);
    Object.assign(medicine, dto);
    return this.medicineRepo.save(medicine);
  }

  async deactivate(id: string): Promise<void> {
    await this.medicineRepo.update(id, { isActive: false });
  }
}
