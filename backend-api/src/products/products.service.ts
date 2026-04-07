import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllActive(page?: number, limit?: number): Promise<any> {
    if (page && limit) {
      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const [data, total] = await this.productRepository.findAndCount({
        where: { isActive: true },
        relations: ['category', 'brand'],
        take,
        skip,
      });
      return { data, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
    }
    return this.productRepository.find({ where: { isActive: true }, relations: ['category', 'brand'] });
  }

  async findByCategory(categoryId: string, page?: number, limit?: number): Promise<any> {
    if (page && limit) {
      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const [data, total] = await this.productRepository.findAndCount({
        where: { categoryId, isActive: true },
        relations: ['category', 'brand'],
        take,
        skip,
      });
      return { data, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
    }
    return this.productRepository.find({ where: { categoryId, isActive: true }, relations: ['category', 'brand'] });
  }

  async findByBrand(brandId: string, page?: number, limit?: number): Promise<any> {
    if (page && limit) {
      const take = Number(limit);
      const skip = (Number(page) - 1) * take;
      const [data, total] = await this.productRepository.findAndCount({
        where: { brandId, isActive: true },
        relations: ['category'],
        take,
        skip,
      });
      return { data, total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) };
    }
    return this.productRepository.find({ where: { brandId, isActive: true }, relations: ['category'] });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id }, relations: ['category'] });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.findById(id);
    Object.assign(product, data);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    product.isActive = false;
    await this.productRepository.save(product);
  }
}
