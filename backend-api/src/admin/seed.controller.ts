import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';

@Controller('admin/seed')
export class SeedController {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  @Post()
  async seed() {
    // 1. Clear existing data
    await this.productRepository.createQueryBuilder().delete().execute();
    await this.categoryRepository.createQueryBuilder().delete().execute();

    // 2. Create Categories
    const categoriesData = [
      { name: 'Snacks', description: 'Chips, crackers, and more', imageUrl: 'https://images.unsplash.com/photo-1599490659223-930b447871fc?w=300' },
      { name: 'Beverages', description: 'Soft drinks, juices, and water', imageUrl: 'https://images.unsplash.com/photo-1527960471264-93ad993e981d?w=300' },
      { name: 'Dairy', description: 'Milk, cheese, and eggs', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300' },
      { name: 'Fruits', description: 'Fresh seasonal fruits', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300' },
      { name: 'Bakery', description: 'Bread, cakes, and pastries', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
      { name: 'Meat', description: 'Fresh beef, chicken, and mutton', imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=300' },
    ];

    const categories = await this.categoryRepository.save(
      categoriesData.map(c => this.categoryRepository.create(c))
    );

    // 3. Create Products
    const productsData = [
      { name: 'Lays Classic', price: 1.50, description: 'Crispy salted chips', categoryId: categories[0].id, imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300', stockQuantity: 100 },
      { name: 'Doritos Nacho', price: 1.80, description: 'Cheesy tortilla chips', categoryId: categories[0].id, imageUrl: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=300', stockQuantity: 80 },
      { name: 'Coca Cola 1.5L', price: 2.00, description: 'Soft drink', categoryId: categories[1].id, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300', stockQuantity: 200 },
      { name: 'Pepsi 1.5L', price: 1.90, description: 'Refreshing cola', categoryId: categories[1].id, imageUrl: 'https://images.unsplash.com/photo-1531384030156-d4444983086b?w=300', stockQuantity: 180 },
      { name: 'Fresh Milk 1L', price: 3.00, description: 'Full cream milk', categoryId: categories[2].id, imageUrl: 'https://images.unsplash.com/photo-1563636619-e910ef2a844b?w=300', stockQuantity: 50 },
      { name: 'Cheddar Cheese', price: 5.50, description: 'Aged sharp cheddar', categoryId: categories[2].id, imageUrl: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=300', stockQuantity: 40 },
      { name: 'Red Apples 1kg', price: 4.50, description: 'Crunchy red apples', categoryId: categories[3].id, imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4701420df2?w=300', stockQuantity: 60 },
      { name: 'Bananas 1 Dozen', price: 2.20, description: 'Fresh sweet bananas', categoryId: categories[3].id, imageUrl: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=300', stockQuantity: 100 },
      { name: 'Chicken Breast', price: 8.00, description: 'Boneless chicken breast', categoryId: categories[5].id, imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300', stockQuantity: 30 },
      { name: 'Beef Steak 500g', price: 12.00, description: 'Premium cut beef', categoryId: categories[5].id, imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=300', stockQuantity: 20 },
    ];

    await this.productRepository.save(
      productsData.map(p => this.productRepository.create(p))
    );

    return { message: 'Seeding completed successfully' };
  }
}
