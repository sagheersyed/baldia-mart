const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const dbConfig = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'baldia_mart' };

const categories = [
  { name: 'Atta, Rice & Grains', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/5751/5751159.png' },
  { name: 'Oil, Ghee & Cooking', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/3053/3053787.png' },
  { name: 'Spices, Salt & Masala', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/820/820712.png' },
  { name: 'Dairy & Eggs', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/869/869664.png' },
  { name: 'Tea & Beverages', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/2855/2855523.png' },
  { name: 'Snacks & Biscuits', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/2515/2515150.png' },
  { name: 'Soft Drinks & Juices', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/2405/2405479.png' },
  { name: 'Personal Care', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/2953/2953982.png' },
  { name: 'Laundry & Household', section: 'mart', img: 'https://cdn-icons-png.flaticon.com/512/2553/2553642.png' },
];

const brands = [
  "National", "Shan", "Olper's", "Milkpak", "Dalda", "Mezan", "Sufi", "Habib", "Tapal", "Lipton",
  "LU", "English Biscuit", "Pepsi", "Coca Cola", "Gourmet", "Nestle", "Surf Excel", "Ariel",
  "Lifebuoy", "Sunsilk", "Lux", "SafeGuard", "Colgate", "Sensodyne", "Pampers", "Molty", "Young's", "Mitchell's", "Brite", "Lemon Max"
];

const productsData = [
  { name: "Shan Bombay Biryani Mix 60g", brand: "Shan", cat: "Spices, Salt & Masala", price: 110, stock: 500 },
  { name: "Shan Sindhi Biryani Mix 60g", brand: "Shan", cat: "Spices, Salt & Masala", price: 110, stock: 500 },
  { name: "Shan Karahi Mix 50g", brand: "Shan", cat: "Spices, Salt & Masala", price: 100, stock: 400 },
  { name: "Shan Nihari Mix 60g", brand: "Shan", cat: "Spices, Salt & Masala", price: 110, stock: 300 },
  { name: "National Bombay Biryani Mix 45g", brand: "National", cat: "Spices, Salt & Masala", price: 95, stock: 500 },
  { name: "National Quorma Masala 45g", brand: "National", cat: "Spices, Salt & Masala", price: 95, stock: 400 },
  { name: "National Iodized Salt 800g", brand: "National", cat: "Spices, Salt & Masala", price: 70, stock: 1000 },
  { name: "Dalda Cooking Oil Pouch 1L", brand: "Dalda", cat: "Oil, Ghee & Cooking", price: 540, stock: 300 },
  { name: "Dalda Banaspati Pouch 1kg", brand: "Dalda", cat: "Oil, Ghee & Cooking", price: 520, stock: 300 },
  { name: "Mezan Canola Oil Pouch 1L", brand: "Mezan", cat: "Oil, Ghee & Cooking", price: 510, stock: 250 },
  { name: "Olper's Milk 1L TP", brand: "Olper's", cat: "Dairy & Eggs", price: 320, stock: 400 },
  { name: "Nestle Milkpak 1L TP", brand: "Nestle", cat: "Dairy & Eggs", price: 325, stock: 400 },
  { name: "Tapal Danedar Tea 190g Pouch", brand: "Tapal", cat: "Tea & Beverages", price: 560, stock: 200 },
  { name: "Lipton Yellow Label 190g", brand: "Lipton", cat: "Tea & Beverages", price: 580, stock: 200 },
  { name: "Pepsi 1.5L", brand: "Pepsi", cat: "Soft Drinks & Juices", price: 180, stock: 500 },
  { name: "Coca Cola 1.5L", brand: "Coca Cola", cat: "Soft Drinks & Juices", price: 180, stock: 500 },
  { name: "LU Prince Chocolate Biscuits Box", brand: "LU", cat: "Snacks & Biscuits", price: 600, stock: 50 },
  { name: "EBM Sooper Biscuits Family Pack", brand: "English Biscuit", cat: "Snacks & Biscuits", price: 150, stock: 200 },
  { name: "SafeGuard Lemon Soap 135g", brand: "SafeGuard", cat: "Personal Care", price: 160, stock: 400 },
  { name: "Lifebuoy Total 10 Soap 115g", brand: "Lifebuoy", cat: "Personal Care", price: 100, stock: 500 },
  { name: "Surf Excel 500g Pouch", brand: "Surf Excel", cat: "Laundry & Household", price: 450, stock: 200 },
  { name: "Ariel Original 500g Pouch", brand: "Ariel", cat: "Laundry & Household", price: 440, stock: 200 },
  { name: "Ashrafi Chakki Atta 10kg", brand: "Mitchell's", cat: "Atta, Rice & Grains", price: 1550, stock: 40 },
  { name: "Gourmet Shahi Basmati Rice 5kg", brand: "Gourmet", cat: "Atta, Rice & Grains", price: 1850, stock: 30 }
];

async function seed() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log("Seeding started...");
    await client.query("BEGIN");

    const catMap = {};
    for (const c of categories) {
      let res = await client.query("SELECT id FROM categories WHERE name = $1 LIMIT 1", [c.name]);
      if (res.rows.length > 0) {
        catMap[c.name] = res.rows[0].id;
      } else {
        res = await client.query(
          "INSERT INTO categories (id, name, section, image_url) VALUES ($1, $2, $3, $4) RETURNING id",
          [uuidv4(), c.name, c.section, c.img]
        );
        catMap[c.name] = res.rows[0].id;
      }
    }

    const brandMap = {};
    for (const b of brands) {
      let res = await client.query("SELECT id FROM brands WHERE name = $1 LIMIT 1", [b]);
      if (res.rows.length > 0) {
        brandMap[b] = res.rows[0].id;
      } else {
        res = await client.query(
          "INSERT INTO brands (id, name) VALUES ($1, $2) RETURNING id",
          [uuidv4(), b]
        );
        brandMap[b] = res.rows[0].id;
      }
    }

    let vRes = await client.query("SELECT id FROM vendors WHERE name = $1 LIMIT 1", ["Baldia Super Market"]);
    let vendorId;
    if (vRes.rows.length > 0) {
      vendorId = vRes.rows[0].id;
    } else {
      vRes = await client.query(
        "INSERT INTO vendors (id, name, phone_number, address) VALUES ($1, $2, $3, $4) RETURNING id",
        [uuidv4(), "Baldia Super Market", "+923001234567", "Baldia Town, Karachi"]
      );
      vendorId = vRes.rows[0].id;
    }

    let count = 0;
    for (const p of productsData) {
      const existing = await client.query("SELECT id FROM products WHERE name = $1 LIMIT 1", [p.name]);
      if (existing.rows.length > 0) continue;

      const pId = uuidv4();
      await client.query(
        "INSERT INTO products (id, category_id, brand_id, name, description, price, stock_quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [pId, catMap[p.cat], brandMap[p.brand], p.name, "Genuine " + p.name + " available at Baldia Mart.", p.price, p.stock, 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png']
      );
      await client.query(
        "INSERT INTO vendor_products (id, vendor_id, product_id, price, stock_qty) VALUES ($1, $2, $3, $4, $5)",
        [uuidv4(), vendorId, pId, p.price, p.stock]
      );
      count++;
    }

    await client.query("COMMIT");
    console.log("✅ SUCCESS! Added " + count + " new Pakistani products.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ ERROR:", err.message);
  } finally {
    await client.end();
  }
}
seed();
