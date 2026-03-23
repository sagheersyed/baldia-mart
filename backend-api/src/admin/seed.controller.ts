import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { DeliveryZone } from '../delivery-zones/delivery-zone.entity';
import { Address } from '../addresses/address.entity';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcryptjs';

@Controller('admin/seed')
export class SeedController {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(DeliveryZone)
    private deliveryZoneRepository: Repository<DeliveryZone>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  @Post()
  async seed() {
    // 1. Clear existing data (dependent tables first to avoid FK errors)
    const manager = this.categoryRepository.manager;
    const tables = [
      'rider_reviews', 'order_history', 'order_items', 'orders',
      'cart_items', 'addresses', 'products', 'categories',
      'riders', 'users', 'delivery_zones', 'otps', 'notifications', 'payments'
    ];

    for (const table of tables) {
      try {
        await manager.query(`DELETE FROM "${table}"`);
        console.log(`Cleared table: ${table}`);
      } catch (e) {
        console.error(`Failed to clear table ${table}: ${e.message}`);
        // Continue anyway if table doesn't exist
      }
    }

    // 2. Create Mock User for testing
    const mockUser = await this.userRepository.save(
      this.userRepository.create({
        id: '99999999-9999-9999-9999-999999999999', // Fixed ID for seeding
        firebaseUid: 'mock-google',
        email: 'mock@google.com',
        name: 'Mock Google User',
        role: 'customer'
      })
    );

    const adminHash = await bcrypt.hash('admin123', 10);
    const adminUser = await this.userRepository.save(
      this.userRepository.create({
        id: '88888888-8888-8888-8888-888888888888',
        email: 'admin@baldiamart.com',
        password: adminHash,
        name: 'Super Admin',
        role: 'admin'
      })
    );

    // 3. Create Mock Address
    await this.addressRepository.save(
      this.addressRepository.create({
        userId: mockUser.id,
        label: 'Home',
        streetAddress: 'House 123, Sector 4, Baldia Town',
        latitude: 24.9144,
        longitude: 66.9748,
        isDefault: true
      })
    );

    // 2. Create Delivery Zone
    await this.deliveryZoneRepository.save(
      this.deliveryZoneRepository.create({
        name: 'Baldia Town & Surroundings',
        centerLat: 24.9144,
        centerLng: 66.9748,
        radiusKm: 50.00
      })
    );

    // 3. Create Categories
    const baseUrl = 'http://192.168.100.142:3000';
    const categoriesData = [
      { name: 'Vegetables', description: 'Farm fresh local produce', imageUrl: `${baseUrl}/public/cat_veg.png` },
      { name: 'Fruits', description: 'Seasonal and exotic fruits', imageUrl: `${baseUrl}/public/cat_fruit.png` },
      { name: 'Meat & Poultry', description: 'Fresh halal meat', imageUrl: `${baseUrl}/public/cat_meat.png` },
      { name: 'Dairy & Breakfast', description: 'Milk, eggs, and bread', imageUrl: `${baseUrl}/public/cat_dairy.png` },
      { name: 'Beverages', description: 'Soft drinks and juices', imageUrl: `${baseUrl}/public/cat_bev.png` },
      { name: 'Snacks', description: 'Chips and biscuits', imageUrl: `${baseUrl}/public/cat_snack.png` },
      { name: 'Frozen Foods', description: 'Ready to cook', imageUrl: 'https://images.unsplash.com/photo-1584210228185-04d89c164104?q=80&w=600' },
      { name: 'Personal Care', description: 'Hygiene and soaps', imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600' },
    ];

    const categories = await this.categoryRepository.save(
      categoriesData.map(c => this.categoryRepository.create(c))
    );

    const getCatId = (name: string): string => {
      const cat = categories.find(c => c.name === name);
      return cat ? cat.id : "";
    };

    // 3. Create Products (Bulked list)
    const productsData = [
      // Vegetables
      { name: 'Potatoes (Alu) 1kg', price: 100, discount: 0, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400', stockQuantity: 500 },
      { name: 'Onions (Piyaz) 1kg', price: 150, discount: 10, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=400', stockQuantity: 400 },
      { name: 'Tomatoes (Tamatar) 1kg', price: 200, discount: 20, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=400', stockQuantity: 200 },
      { name: 'Okra (Bhindi) 500g', price: 120, discount: 0, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=400', stockQuantity: 80 },

      // Fruits
      { name: 'Bananas (Dozen)', price: 180, discount: 10, categoryId: getCatId('Fruits'), imageUrl: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?q=80&w=400', stockQuantity: 200 },
      { name: 'Red Apples 1kg', price: 350, discount: 30, categoryId: getCatId('Fruits'), imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6bcd6?q=80&w=400', stockQuantity: 150 },
      { name: 'Oranges Dozen', price: 300, discount: 0, categoryId: getCatId('Fruits'), imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53da1d7?q=80&w=400', stockQuantity: 100 },

      // Meat
      { name: 'Fresh Chicken kg', price: 750, discount: 50, categoryId: getCatId('Meat & Poultry'), imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=400', stockQuantity: 100 },
      { name: 'Beef Boneless kg', price: 1200, discount: 100, categoryId: getCatId('Meat & Poultry'), imageUrl: 'https://images.unsplash.com/photo-1546248136-2470cda3bc6d?q=80&w=400', stockQuantity: 50 },

      // Dairy
      { name: 'Fresh Milk (1L)', price: 210, discount: 0, categoryId: getCatId('Dairy & Breakfast'), imageUrl: 'https://images.unsplash.com/photo-1563636619-e9107da5a1bb?q=80&w=400', stockQuantity: 200 },
      { name: 'Farm Eggs Dozen', price: 360, discount: 20, categoryId: getCatId('Dairy & Breakfast'), imageUrl: 'https://images.unsplash.com/photo-1516746924755-90299f24419b?q=80&w=400', stockQuantity: 100 },

      // Beverages
      { name: 'Coca Cola 1.5L', price: 180, discount: 5, categoryId: getCatId('Beverages'), imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=400', stockQuantity: 300 },
      { name: 'Pepsi 1.5L', price: 180, discount: 5, categoryId: getCatId('Beverages'), imageUrl: 'https://images.unsplash.com/photo-1629203851022-3cd263900870?q=80&w=400', stockQuantity: 300 },

      // Snacks
      { name: 'Lays Classic Pack', price: 120, discount: 0, categoryId: getCatId('Snacks'), imageUrl: 'https://images.unsplash.com/photo-1566478989037-e923e528d4fa?q=80&w=400', stockQuantity: 200 },
      { name: 'Digestive Biscuits', price: 90, discount: 0, categoryId: getCatId('Snacks'), imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=400', stockQuantity: 180 },
    ];

    await this.productRepository.save(
      productsData.map(p => this.productRepository.create(p))
    );

    return { message: 'Seeding completed: Added Admin, Mock User, Address, Categories, and Products' };
  }
}
