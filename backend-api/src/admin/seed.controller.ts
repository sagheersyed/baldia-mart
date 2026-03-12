import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { DeliveryZone } from '../delivery-zones/delivery-zone.entity';
import { Address } from '../addresses/address.entity';
import { User } from '../users/user.entity';

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
  ) {}

  @Post()
  async seed() {
    // 1. Clear existing data
    await this.addressRepository.createQueryBuilder().delete().execute();
    await this.productRepository.createQueryBuilder().delete().execute();
    await this.categoryRepository.createQueryBuilder().delete().execute();
    await this.deliveryZoneRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();

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
    const categoriesData = [
      { name: 'Vegetables', description: 'Farm fresh local produce', imageUrl: 'https://images.unsplash.com/photo-1597362868479-dfec3ac22784?w=400' },
      { name: 'Fruits', description: 'Seasonal and exotic fruits', imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400' },
      { name: 'Meat & Poultry', description: 'Fresh halal meat', imageUrl: 'https://images.unsplash.com/photo-1607623273465-83f886f6f04b?w=400' },
      { name: 'Dairy & Breakfast', description: 'Milk, eggs, and bread', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
      { name: 'Beverages', description: 'Soft drinks and juices', imageUrl: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=400' },
      { name: 'Snacks', description: 'Chips and biscuits', imageUrl: 'https://images.unsplash.com/photo-1566478989037-e923e528d4fa?w=400' },
      { name: 'Frozen Foods', description: 'Ready to cook', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
      { name: 'Personal Care', description: 'Hygiene and soaps', imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400' },
    ];

    const categories = await this.categoryRepository.save(
      categoriesData.map(c => this.categoryRepository.create(c))
    );

    const getCatId = (name: string) => categories.find(c => c.name === name)?.id;

    // 3. Create Products (Bulked list)
    const productsData = [
      // Vegetables
      { name: 'Potatoes (Alu) 1kg', price: 1.00, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', stockQuantity: 500 },
      { name: 'Onions (Piyaz) 1kg', price: 1.50, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400', stockQuantity: 400 },
      { name: 'Tomatoes (Tamatar) 1kg', price: 2.00, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', stockQuantity: 200 },
      { name: 'Okra (Bhindi) 500g', price: 1.50, categoryId: getCatId('Vegetables'), imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400', stockQuantity: 80 },
      
      // Fruits
      { name: 'Bananas (Dozen)', price: 2.00, categoryId: getCatId('Fruits'), imageUrl: 'https://images.unsplash.com/photo-1571771894821-ad99621139c4?w=400', stockQuantity: 200 },
      { name: 'Red Apples 1kg', price: 3.00, categoryId: getCatId('Fruits'), imageUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400', stockQuantity: 150 },
      { name: 'Oranges Dozen', price: 4.00, categoryId: getCatId('Fruits'), imageUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=400', stockQuantity: 100 },
      
      // Meat
      { name: 'Fresh Chicken kg', price: 5.00, categoryId: getCatId('Meat & Poultry'), imageUrl: 'https://images.unsplash.com/photo-1587593817645-425017df7fdb?w=400', stockQuantity: 100 },
      { name: 'Beef Boneless kg', price: 8.00, categoryId: getCatId('Meat & Poultry'), imageUrl: 'https://images.unsplash.com/photo-1588168333986-50d8184b3c58?w=400', stockQuantity: 50 },
      
      // Dairy
      { name: 'Fresh Milk (1L)', price: 1.50, categoryId: getCatId('Dairy & Breakfast'), imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', stockQuantity: 200 },
      { name: 'Farm Eggs Dozen', price: 2.50, categoryId: getCatId('Dairy & Breakfast'), imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400', stockQuantity: 100 },
      
      // Beverages
      { name: 'Coca Cola 1.5L', price: 1.20, categoryId: getCatId('Beverages'), imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', stockQuantity: 300 },
      { name: 'Pepsi 1.5L', price: 1.20, categoryId: getCatId('Beverages'), imageUrl: 'https://images.unsplash.com/photo-1629203851022-3cd263900870?w=400', stockQuantity: 300 },
      
      // Snacks
      { name: 'Lays Classic Pack', price: 1.50, categoryId: getCatId('Snacks'), imageUrl: 'https://images.unsplash.com/photo-1566478989037-e923e528d4fa?w=400', stockQuantity: 200 },
      { name: 'Digestive Biscuits', price: 1.00, categoryId: getCatId('Snacks'), imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', stockQuantity: 180 },
    ];

    await this.productRepository.save(
      productsData.map(p => this.productRepository.create(p))
    );

    return { message: 'Seeding completed: Added Mock User, Mock Address, 8 Categories, and 15+ Products' };
  }
}
