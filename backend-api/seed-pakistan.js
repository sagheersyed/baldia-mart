const { Client } = require('pg');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // assuming uuid is installed, otherwise we rely on db gen_random_uuid
require('dotenv').config();

const dbConfig = {
  host: '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'baldia_mart',
};

// ─── Real Pakistani Market Data ───
const categories = [
  { id: uuidv4(), name: 'Dairy & Milk', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/869/869664.png' },
  { id: uuidv4(), name: 'Oil & Ghee', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3053/3053787.png' },
  { id: uuidv4(), name: 'Spices & Recipe', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/820/820712.png' },
  { id: uuidv4(), name: 'Tea & Coffee', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2855/2855523.png' },
  { id: uuidv4(), name: 'Snacks & Biscuits', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2515/2515150.png' },
  { id: uuidv4(), name: 'Personal Care', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2953/2953982.png' },
  { id: uuidv4(), name: 'Atta & Rice', section: 'mart', imageUrl: 'https://cdn-icons-png.flaticon.com/512/5751/5751159.png' },
];

const getCat = (name) => categories.find(c => c.name === name).id;

const brands = [
  { id: uuidv4(), name: "Olper's" },
  { id: uuidv4(), name: "National" },
  { id: uuidv4(), name: "Shan" },
  { id: uuidv4(), name: "Dalda" },
  { id: uuidv4(), name: "Lipton" },
  { id: uuidv4(), name: "Tapal" },
  { id: uuidv4(), name: "LU" },
  { id: uuidv4(), name: "Unilever" },
  { id: uuidv4(), name: "PepsiCo" },
  { id: uuidv4(), name: "Mezan" },
  { id: uuidv4(), name: "Gourmet" },
];

const getBrand = (name) => brands.find(b => b.name === name).id;

const products = [
  // Dairy & Milk
  { name: "Olper's Full Cream Milk 1 Litre", brand: "Olper's", cat: "Dairy & Milk", price: 320, discount: 0, stock: 150 },
  { name: "Olper's Cream 200ml", brand: "Olper's", cat: "Dairy & Milk", price: 210, discount: 0, stock: 80 },
  
  // Oil & Ghee
  { name: "Dalda Cooking Oil Pouch 1 Litre", brand: "Dalda", cat: "Oil & Ghee", price: 540, discount: 520, stock: 200 },
  { name: "Mezan Canola Oil 1 Litre", brand: "Mezan", cat: "Oil & Ghee", price: 510, discount: 0, stock: 120 },
  { name: "Dalda VTF Banaspati Ghee 1kg", brand: "Dalda", cat: "Oil & Ghee", price: 530, discount: 0, stock: 90 },

  // Spices & Recipe
  { name: "National Bombay Biryani Recipe Mix 130g", brand: "National", cat: "Spices & Recipe", price: 140, discount: 130, stock: 300 },
  { name: "Shan Chicken Tikka Mix 50g", brand: "Shan", cat: "Spices & Recipe", price: 120, discount: 0, stock: 200 },
  { name: "National Tomato Ketchup 800g", brand: "National", cat: "Spices & Recipe", price: 350, discount: 320, stock: 85 },
  { name: "National Chilli Garlic Sauce 800g", brand: "National", cat: "Spices & Recipe", price: 360, discount: 0, stock: 60 },
  { name: "Shan Haleem Mix 300g", brand: "Shan", cat: "Spices & Recipe", price: 240, discount: 0, stock: 110 },
  { name: "National Iodized Salt 800g", brand: "National", cat: "Spices & Recipe", price: 70, discount: 0, stock: 500 },

  // Tea & Coffee
  { name: "Lipton Yellow Label Tea 190g", brand: "Lipton", cat: "Tea & Coffee", price: 580, discount: 550, stock: 180 },
  { name: "Tapal Danedar Tea 190g", brand: "Tapal", cat: "Tea & Coffee", price: 560, discount: 0, stock: 250 },
  { name: "Tapal Family Mixture 900g", brand: "Tapal", cat: "Tea & Coffee", price: 1250, discount: 1200, stock: 50 },

  // Snacks & Biscuits
  { name: "LU Prince Chocolate Biscuits Half Roll", brand: "LU", cat: "Snacks & Biscuits", price: 50, discount: 0, stock: 400 },
  { name: "LU Bakeri Nankhatai Biscuits", brand: "LU", cat: "Snacks & Biscuits", price: 120, discount: 0, stock: 150 },
  { name: "LU Tuc Biscuits Half Roll", brand: "LU", cat: "Snacks & Biscuits", price: 40, discount: 0, stock: 500 },
  { name: "Lays French Cheese 40g", brand: "PepsiCo", cat: "Snacks & Biscuits", price: 50, discount: 0, stock: 350 },
  { name: "Lays Masala 40g", brand: "PepsiCo", cat: "Snacks & Biscuits", price: 50, discount: 0, stock: 300 },
  { name: "Kurkure Red Chilli Jhatka 50g", brand: "PepsiCo", cat: "Snacks & Biscuits", price: 50, discount: 0, stock: 250 },

  // Personal Care
  { name: "Surf Excel Washing Powder 500g", brand: "Unilever", cat: "Personal Care", price: 450, discount: 420, stock: 100 },
  { name: "Lifebuoy Total Protect Soap 115g", brand: "Unilever", cat: "Personal Care", price: 95, discount: 0, stock: 600 },
  { name: "Sunsilk Black Shine Shampoo 185ml", brand: "Unilever", cat: "Personal Care", price: 420, discount: 0, stock: 140 },
  { name: "Dove Deep Moisture Body Wash 250ml", brand: "Unilever", cat: "Personal Care", price: 850, discount: 800, stock: 40 },

  // Atta & Rice
  { name: "Gourmet Chakki Atta 10kg", brand: "Gourmet", cat: "Atta & Rice", price: 1450, discount: 0, stock: 30 },
];

const vendors = [
  { id: uuidv4(), name: 'Al-Madina Super Store', email: 'almadina@baldiamart.com', phone: '+923000000001', address: 'Baldia Town Sector 4, Karachi', isVerified: true, isActive: true },
  { id: uuidv4(), name: 'Bismillah General Store', email: 'bismillah@baldiamart.com', phone: '+923000000002', address: 'Saeedabad, Baldia Town, Karachi', isVerified: true, isActive: true }
];

async function runSeed() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query('BEGIN');

    // 1. Insert Categories
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (id, name, section, image_url, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.name, cat.section, cat.imageUrl, true]
      );
    }
    console.log(`✅ Inserted ${categories.length} Categories`);

    // 2. Insert Brands
    for (const brand of brands) {
      await client.query(
        `INSERT INTO brands (id, name, is_active) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [brand.id, brand.name, true]
      );
    }
    console.log(`✅ Inserted ${brands.length} Brands`);

    // 3. Insert Vendors
    for (const vendor of vendors) {
      await client.query(
        `INSERT INTO vendors (id, name, phone_number, email, address, is_verified, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [vendor.id, vendor.name, vendor.phone, vendor.email, vendor.address, vendor.isVerified, vendor.isActive]
      );
    }
    console.log(`✅ Inserted ${vendors.length} Vendors`);

    // 4. Insert Products and link them to Vendor 1 (Al-Madina)
    let productCount = 0;
    for (const p of products) {
      const pId = uuidv4();
      const insertProductStr = `
        INSERT INTO products (id, category_id, brand_id, name, description, price, discount_price, stock_quantity, image_url, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
      `;
      const res = await client.query(insertProductStr, [
        pId, getCat(p.cat), getBrand(p.brand), p.name, "Fresh " + p.name + " available at Baldia Mart.", p.price, p.discount > 0 ? p.discount : null, p.stock, 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', true
      ]);

      // Link to Vendor
      await client.query(`
        INSERT INTO vendor_products (id, vendor_id, product_id, price, stock_qty, is_available)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uuidv4(), vendors[0].id, pId, p.price, p.stock, true]);
      
      productCount++;
    }

    await client.query('COMMIT');
    console.log("✅ Inserted " + productCount + " Realistic Pakistani Products! Seeding Complete.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.end();
  }
}

runSeed();
