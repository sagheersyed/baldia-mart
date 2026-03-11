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

  async findAllActive(): Promise<Product[]> {
    return this.productRepository.find({ where: { isActive: true }, relations: ['category'] });
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.productRepository.find({ where: { categoryId, isActive: true } });
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
    await this.productRepository.remove(product);
  }
}
