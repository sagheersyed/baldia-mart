const { Client } = require('pg');
const crypto = require('crypto');

async function seed() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'baldia_mart',
    password: 'postgres',
    port: 5432
  });

  try {
    await client.connect();
    console.log('Connected to database for pharma seeding...');

    // 1. Create Pharma Categories
    const categories = [
      { name: 'Pain Relief', desc: 'Medicine for headaches, body pain, fever', icon: 'https://cdn-icons-png.flaticon.com/512/3022/3022513.png' },
      { name: 'Antibiotics', desc: 'Bacterial infection treatments', icon: 'https://cdn-icons-png.flaticon.com/512/4320/4320340.png' },
      { name: 'Vitamins & Supplements', desc: 'Immunity boosters and multivitamins', icon: 'https://cdn-icons-png.flaticon.com/512/3022/3022567.png' },
      { name: 'Cold & Flu', desc: 'Cough syrups and flu medicine', icon: 'https://cdn-icons-png.flaticon.com/512/3022/3022517.png' },
      { name: 'Skin Care', desc: 'Medicated creams and ointments', icon: 'https://cdn-icons-png.flaticon.com/512/3022/3022550.png' }
    ];

    const categoryIds = [];
    for (const cat of categories) {
      // Check by name and section to avoid duplicates
      const existing = await client.query("SELECT id FROM categories WHERE name = $1 AND section = 'pharma'", [cat.name]);
      if (existing.rows.length > 0) {
        categoryIds.push(existing.rows[0].id);
        console.log(`- Category exists: ${cat.name}`);
      } else {
        const id = crypto.randomUUID();
        await client.query(
          "INSERT INTO categories (id, name, description, image_url, section, is_active) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, cat.name, cat.desc, cat.icon, 'pharma', true]
        );
        categoryIds.push(id);
        console.log(`- Created category: ${cat.name}`);
      }
    }

    // 2. Create Dummy Medicines
    const medicines = [
      {
        name: 'Panadol Advance 500mg',
        generic: 'Paracetamol',
        mrp: 50,
        rx: false,
        otc: true,
        emergency: true,
        dosage: 'Tablet',
        strength: '500mg',
        pack: 'Strip of 10',
        catIdx: 0,
        img: 'https://pharmacy.com.pk/wp-content/uploads/2021/12/panadol-advance.jpg'
      },
      {
        name: 'Amoxicillin 250mg',
        generic: 'Amoxicillin',
        mrp: 120,
        rx: true,
        otc: false,
        emergency: false,
        dosage: 'Capsule',
        strength: '250mg',
        pack: 'Box of 20',
        catIdx: 1,
        img: 'https://cdn.shopify.com/s/files/1/0270/2219/6784/products/Amoxicillin_250mg_Capsules_Pack_of_15.jpg?v=1626248924'
      },
      {
        name: 'Centrum Silver Multivitamin',
        generic: 'Multivitamin',
        mrp: 2450,
        rx: false,
        otc: true,
        emergency: false,
        dosage: 'Tablet',
        strength: 'Complete',
        pack: 'Bottle of 60',
        catIdx: 2,
        img: 'https://www.centrum.com/content/dam/cf-consumer-healthcare/centrum-relaunch/en_US/products/silver-multivitamin-for-men-50-plus/Desktop/Silver_Men_60ct_Front.png'
      },
      {
        name: 'Brufen 400mg',
        generic: 'Ibuprofen',
        mrp: 180,
        rx: false,
        otc: true,
        emergency: true,
        dosage: 'Tablet',
        strength: '400mg',
        pack: 'Strip of 10',
        catIdx: 0,
        img: 'https://cdn.dawaai.pk/shop/images/panadol_400mg_tabs.jpg'
      }
    ];

    const medicineIds = [];
    for (const med of medicines) {
      const existing = await client.query("SELECT id FROM medicines WHERE name = $1", [med.name]);
      if (existing.rows.length > 0) {
        medicineIds.push(existing.rows[0].id);
        console.log(`- Medicine exists: ${med.name}`);
      } else {
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO medicines 
          (id, name, generic_name, mrp, requires_prescription, is_otc, is_emergency, dosage_form, strength, pack_size, category_id, image_url, is_active, is_featured) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [id, med.name, med.generic, med.mrp, med.rx, med.otc, med.emergency, med.dosage, med.strength, med.pack, categoryIds[med.catIdx], med.img, true, true]
        );
        medicineIds.push(id);
        console.log(`- Created medicine: ${med.name}`);
      }
    }

    // 3. Create Dummy Pharmacy
    let activePharmacyId;
    const existingPh = await client.query("SELECT id FROM pharmacies WHERE license_number = 'L-12345-KHI'");
    if (existingPh.rows.length > 0) {
      activePharmacyId = existingPh.rows[0].id;
      console.log('- Pharmacy exists');
    } else {
      activePharmacyId = crypto.randomUUID();
      await client.query(
        `INSERT INTO pharmacies 
        (id, name, license_number, pharmacist_name, onboarding_status, address, phone_number, is_active, is_verified, is_open) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [activePharmacyId, 'Baldia Town Pharmacy', 'L-12345-KHI', 'Dr. Sajid Ahmed', 'approved', 'Shop 4, Main Baldia Road', '03001234567', true, true, true]
      );
      console.log('- Created pharmacy');
    }

    // 4. Link Inventory
    for (const medId of medicineIds) {
      const existingInv = await client.query("SELECT id FROM pharmacy_inventory WHERE pharmacy_id = $1 AND medicine_id = $2", [activePharmacyId, medId]);
      if (existingInv.rows.length === 0) {
        await client.query(
          `INSERT INTO pharmacy_inventory 
          (id, pharmacy_id, medicine_id, stock_quantity, selling_price, is_available) 
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [crypto.randomUUID(), activePharmacyId, medId, 100, null, true]
        );
        console.log(`- Linked medicine ${medId} to inventory`);
      }
    }

    console.log('PHARMA SEEDING COMPLETE! 🚀');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await client.end();
  }
}

seed();
