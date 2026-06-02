import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Medicine } from './medicine.entity';
import { MedicineReview } from './medicine-review.entity';
import { Category } from '../../categories/category.entity';
import { Brand } from '../../brands/brand.entity';
import { OrdersGateway } from '../../orders/orders.gateway';

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(MedicineReview)
    private readonly reviewRepo: Repository<MedicineReview>,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
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
    maxPrice?: number;
    itemType?: string;
    ids?: string;
  }) {
    const { query, categoryId, brandId, otcOnly, isEmergency, page = 1, limit = 20, maxPrice, itemType, ids } = params;

    const qb = this.medicineRepo
      .createQueryBuilder('m')
      .where('m.isActive = :active', { active: true });

    // Batch-fetch by comma-separated IDs (used by EventDetailsScreen)
    if (ids) {
      const idList = ids.split(',').map(x => x.trim()).filter(Boolean);
      if (idList.length > 0) {
        qb.andWhere('m.id IN (:...idList)', { idList });
      }
    }

    if (maxPrice) {
      qb.andWhere('(m.mrp - COALESCE(m.discount, 0)) <= :maxPrice', { maxPrice });
    }

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
    if (itemType) qb.andWhere('m.itemType = :itemType', { itemType });

    qb.leftJoinAndSelect('m.brand', 'brand')
      .orderBy('m.sortOrder', 'ASC')
      .addOrderBy('m.soldCount', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Medicine> {
    const medicine = await this.medicineRepo.findOne({ 
      where: { id },
      relations: ['brand']
    });
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
      relations: ['brand'],
      order: { sortOrder: 'ASC', soldCount: 'DESC' },
      take: limit,
    });
  }

  async getEmergency(limit = 20): Promise<Medicine[]> {
    return this.medicineRepo.find({
      where: { isActive: true, isEmergency: true },
      relations: ['brand'],
      order: { sortOrder: 'ASC' },
      take: limit,
    });
  }

  async getByCategory(categoryId: string, page = 1, limit = 20) {
    const [data, total] = await this.medicineRepo.findAndCount({
      where: { categoryId, isActive: true },
      relations: ['brand'],
      order: { sortOrder: 'ASC', name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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
  
  /**
   * Find medicines with the same generic name (alternatives).
   */
  async findByGenericName(genericName: string, excludeId?: string): Promise<Medicine[]> {
    if (!genericName) return [];
    
    const qb = this.medicineRepo.createQueryBuilder('m')
      .where('m.genericName = :genericName', { genericName })
      .andWhere('m.isActive = :active', { active: true });
      
    if (excludeId) {
      qb.andWhere('m.id != :excludeId', { excludeId });
    }
    
    return qb.getMany();
  }

  // ── Admin CRUD ────────────────────────────────────────────────

  async create(dto: Partial<Medicine>): Promise<Medicine> {
    const medicine = this.medicineRepo.create(dto);
    const saved = await this.medicineRepo.save(medicine);
    this.ordersGateway.emitPharmaUpdated();
    return saved;
  }

  async update(id: string, dto: Partial<Medicine>): Promise<Medicine> {
    const medicine = await this.findById(id);
    Object.assign(medicine, dto);
    const saved = await this.medicineRepo.save(medicine);
    this.ordersGateway.emitPharmaUpdated();
    return saved;
  }

  async deactivate(id: string): Promise<void> {
    await this.medicineRepo.update(id, { isActive: false });
    this.ordersGateway.emitPharmaUpdated();
  }

  // ── Reviews ───────────────────────────────────────────────────

  async getReviews(medicineId: string) {
    return this.reviewRepo.find({
      where: { medicineId, isApproved: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async submitReview(userId: string, medicineId: string, dto: { rating: number; comment?: string; orderId?: string }) {
    const review = this.reviewRepo.create({
      userId,
      medicineId,
      ...dto,
      isVerifiedPurchase: !!dto.orderId,
    });
    const saved = await this.reviewRepo.save(review);
    
    // Update medicine average rating
    await this.updateAverageRating(medicineId);
    
    return saved;
  }

  private async updateAverageRating(medicineId: string) {
    const stats = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.medicineId = :medicineId AND review.isApproved = true', { medicineId })
      .getRawOne();

    await this.medicineRepo.update(medicineId, {
      rating: parseFloat(stats.avg) || 0,
      ratingCount: parseInt(stats.count) || 0,
    });
  }
}
