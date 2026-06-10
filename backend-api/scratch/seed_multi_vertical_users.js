const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'baldia_mart',
  });

  try {
    await client.connect();
    console.log('Connected to DB.');

    // Pre-hash MPIN "1234"
    const hashedMpin = await bcrypt.hash('1234', 10);
    console.log('Pre-hashed MPIN "1234" generated.');

    // 1. Fetch all grocery vendors
    const vendorsRes = await client.query('SELECT id, name FROM vendors WHERE is_active = true;');
    const vendors = vendorsRes.rows;
    console.log(`Found ${vendors.length} active grocery vendors.`);

    // 2. Fetch all restaurants
    const restaurantsRes = await client.query('SELECT id, name FROM restaurants WHERE is_active = true;');
    const restaurants = restaurantsRes.rows;
    console.log(`Found ${restaurants.length} active restaurants.`);

    // 3. Fetch all pharmacies (safely catch if table or schema differs)
    let pharmacies = [];
    try {
      const pharmaRes = await client.query('SELECT id, name FROM pharmacies WHERE is_active = true;');
      pharmacies = pharmaRes.rows;
      console.log(`Found ${pharmacies.length} active pharmacies.`);
    } catch (err) {
      console.log('Pharmacies table not found or query failed, skipping pharmacies.');
    }

    const testUsersList = [];

    // Helper function to process each store entity
    async function processEntity(entityId, entityName, type, phoneNumber, index) {
      // a. Insert or find tenant
      let tenantId;
      const tenantRes = await client.query('SELECT id FROM tenants WHERE entity_id = $1 AND type = $2;', [entityId, type]);
      if (tenantRes.rows.length > 0) {
        tenantId = tenantRes.rows[0].id;
      } else {
        tenantId = uuidv4();
        await client.query(
          'INSERT INTO tenants (id, name, type, status, entity_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW());',
          [tenantId, entityName, type, 'active', entityId]
        );
        console.log(`Created tenant: "${entityName}" (${type})`);
      }

      // b. Insert or find user
      let userId;
      const userRes = await client.query('SELECT id FROM users WHERE phone_number = $1;', [phoneNumber]);
      const merchantName = `${entityName} Owner`;
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
        // Ensure MPIN is updated so they can log in
        await client.query('UPDATE users SET mpin = $1, name = $2 WHERE id = $3;', [hashedMpin, merchantName, userId]);
      } else {
        userId = uuidv4();
        await client.query(
          'INSERT INTO users (id, name, phone_number, mpin, is_phone_verified, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, \'customer\', true, NOW(), NOW());',
          [userId, merchantName, phoneNumber, hashedMpin]
        );
        console.log(`Created merchant user: "${merchantName}" with phone ${phoneNumber}`);
      }

      // c. Insert or find tenant membership
      const membershipRes = await client.query(
        'SELECT id FROM tenant_users WHERE tenant_id = $1 AND user_id = $2;',
        [tenantId, userId]
      );
      if (membershipRes.rows.length === 0) {
        await client.query(
          'INSERT INTO tenant_users (id, tenant_id, user_id, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, NOW(), NOW());',
          [uuidv4(), tenantId, userId, 'owner']
        );
        console.log(`Assigned "${merchantName}" as owner of "${entityName}"`);
      }

      testUsersList.push({
        storeName: entityName,
        type: type,
        phone: phoneNumber,
        mpin: '1234'
      });
    }

    // Process Grocery Vendors (Phone range: +923000000001 to +923000000010)
    for (let i = 0; i < vendors.length; i++) {
      const phone = `+9230000000${String(i + 1).padStart(2, '0')}`;
      await processEntity(vendors[i].id, vendors[i].name, 'grocery', phone, i);
    }

    // Process Restaurants (Phone range: +923000000101 to +923000000110)
    for (let i = 0; i < restaurants.length; i++) {
      const phone = `+9230000001${String(i + 1).padStart(2, '0')}`;
      await processEntity(restaurants[i].id, restaurants[i].name, 'restaurant', phone, i);
    }

    // Process Pharmacies (Phone range: +923000000201 to +923000000210)
    for (let i = 0; i < pharmacies.length; i++) {
      const phone = `+9230000002${String(i + 1).padStart(2, '0')}`;
      await processEntity(pharmacies[i].id, pharmacies[i].name, 'pharmacy', phone, i);
    }

    console.log('\n==================================================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==================================================================');
    console.log('Use the following details to log in as different merchants:');
    console.table(testUsersList);
    console.log('==================================================================');

  } catch (err) {
    console.error('Error seeding test users:', err);
  } finally {
    await client.end();
  }
}

main();
