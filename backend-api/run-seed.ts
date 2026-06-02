import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  console.log('Mounting Nest Context for Seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const categoriesRows = [
      { id: uuidv4(), name: 'Dairy & Milk', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/869/869664.png' },
      { id: uuidv4(), name: 'Oil & Ghee', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/3053/3053787.png' },
      { id: uuidv4(), name: 'Spices & Recipe', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/820/820712.png' },
      { id: uuidv4(), name: 'Tea & Coffee', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/2855/2855523.png' },
      { id: uuidv4(), name: 'Snacks & Biscuits', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/2515/2515150.png' },
      { id: uuidv4(), name: 'Personal Care', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/2953/2953982.png' },
      { id: uuidv4(), name: 'Atta & Rice', section: 'mart', image_url: 'https://cdn-icons-png.flaticon.com/512/5751/5751159.png' }
    ];

    const getCatId = (name) => categoriesRows.find(c => c.name === name)?.id;
    
    for(const c of categoriesRows) {
       await queryRunner.query(
         "INSERT INTO categories (id, name, section, image_url, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
         [c.id, c.name, c.section, c.image_url, true]
       );
    }

    const brandsRows = [
      { id: uuidv4(), name: "Olper's" },
      { id: uuidv4(), name: "National" },
      { id: uuidv4(), name: "Shan" },
      { id: uuidv4(), name: "Dalda" },
      { id: uuidv4(), name: "Lipton" },
      { id: uuidv4(), name: "Tapal" },
      { id: uuidv4(), name: "LU" },
      { id: uuidv4(), name: "Unilever" },
      { id: uuidv4(), name: "PepsiCo" },
      { id: uuidv4(), name: "Gourmet" }
    ];

    const getBrandId = (n) => brandsRows.find(b => b.name === n)?.id;

    for(const b of brandsRows) {
       await queryRunner.query(
         "INSERT INTO brands (id, name, is_active) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
         [b.id, b.name, true]
       );
    }

    const vendorsRows = [
      { id: uuidv4(), name: 'Al-Madina Super Store', email: 'almadina@baldiamart.com', phone_number: '+923000000001', address: 'Baldia Town Sector 4', is_verified: true, is_active: true }
    ];

    for(const v of vendorsRows) {
       await queryRunner.query(
         "INSERT INTO vendors (id, name, email, phone_number, address, is_verified, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING",
         [v.id, v.name, v.email, v.phone_number, v.address, true, true]
       );
    }

    const prods = [
      // Dairy & Milk
      { name: "Olper's Full Cream Milk 1 Litre", brand: "Olper's", cat: "Dairy & Milk", price: 320, discount: 0 },
      { name: "Olper's Cream 200ml", brand: "Olper's", cat: "Dairy & Milk", price: 210, discount: 0 },
      // Oil & Ghee
      { name: "Dalda Cooking Oil Pouch 1 Litre", brand: "Dalda", cat: "Oil & Ghee", price: 540, discount: 520 },
      { name: "Dalda VTF Banaspati Ghee 1kg", brand: "Dalda", cat: "Oil & Ghee", price: 530, discount: 0 },
      // Spices
      { name: "National Bombay Biryani Recipe Mix 130g", brand: "National", cat: "Spices & Recipe", price: 140, discount: 130 },
      { name: "Shan Chicken Tikka Mix 50g", brand: "Shan", cat: "Spices & Recipe", price: 120, discount: 0 },
      { name: "National Tomato Ketchup 800g", brand: "National", cat: "Spices & Recipe", price: 350, discount: 320 },
      { name: "Shan Haleem Mix 300g", brand: "Shan", cat: "Spices & Recipe", price: 240, discount: 0 },
      // Tea
      { name: "Lipton Yellow Label Tea 190g", brand: "Lipton", cat: "Tea & Coffee", price: 580, discount: 550 },
      { name: "Tapal Danedar Tea 190g", brand: "Tapal", cat: "Tea & Coffee", price: 560, discount: 0 },
      // Snacks
      { name: "LU Prince Chocolate Biscuits", brand: "LU", cat: "Snacks & Biscuits", price: 50, discount: 0 },
      { name: "Lays French Cheese 40g", brand: "PepsiCo", cat: "Snacks & Biscuits", price: 50, discount: 0 },
      { name: "Kurkure Red Chilli Jhatka 50g", brand: "PepsiCo", cat: "Snacks & Biscuits", price: 50, discount: 0 },
      // Personal Care
      { name: "Surf Excel Washing Powder 500g", brand: "Unilever", cat: "Personal Care", price: 450, discount: 420 },
      { name: "Lifebuoy Total Protect Soap 115g", brand: "Unilever", cat: "Personal Care", price: 95, discount: 0 },
      // Atta
      { name: "Gourmet Chakki Atta 10kg", brand: "Gourmet", cat: "Atta & Rice", price: 1450, discount: 0 }
    ];

    let count = 0;
    for(const p of prods) {
       const pId = uuidv4();
       const bId = getBrandId(p.brand);
       const cId = getCatId(p.cat);
       if(!cId || !bId) continue;

       await queryRunner.query(
         "INSERT INTO products (id, category_id, brand_id, name, description, price, discount_price, stock_quantity, image_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING",
         [pId, cId, bId, p.name, "Fresh " + p.name, p.price, p.discount > 0 ? p.discount : null, 100, 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', true]
       );
       
       await queryRunner.query(
         "INSERT INTO vendor_products (id, vendor_id, product_id, price, stock_qty, is_available) VALUES ($1, $2, $3, $4, $5, $6)",
         [uuidv4(), vendorsRows[0].id, pId, p.price, 100, true]
       );
       count++;
    }

    await queryRunner.commitTransaction();
    console.log("✅ SUCCESS! Seeded " + count + " authentic Pakistani products w/ Vendors, Brands & Categories.");
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error("❌ ERROR:", err);
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
