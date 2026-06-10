const { Client } = require('pg');

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
    console.log('Connected to DB successfully.\n');

    // 1. Fetch Users
    const usersRes = await client.query('SELECT id, name, "phone_number" as phone, role FROM users LIMIT 15;');
    console.log('=== AVAILABLE USERS ===');
    console.table(usersRes.rows);

    // 2. Fetch Tenants
    const tenantsRes = await client.query('SELECT id, name, type, status, "entity_id" FROM tenants LIMIT 15;');
    console.log('\n=== AVAILABLE TENANTS / STORES ===');
    console.table(tenantsRes.rows);

    // 3. Fetch Vendors
    const vendorsRes = await client.query('SELECT id, name, is_active FROM vendors LIMIT 15;');
    console.log('\n=== AVAILABLE VENDORS ===');
    console.table(vendorsRes.rows);

    // 4. Fetch Restaurants
    const restRes = await client.query('SELECT id, name, is_active FROM restaurants LIMIT 15;');
    console.log('\n=== AVAILABLE RESTAURANTS ===');
    console.table(restRes.rows);

    // 5. Fetch vendor products count
    const vpRes = await client.query("SELECT COUNT(*) as count FROM vendor_products WHERE vendor_id = '87c47e70-4454-4304-ac84-e2c1282b5bef';");
    console.log('\n=== BALDIA SUPER MARKET PRODUCT COUNT ===');
    console.log(vpRes.rows[0]);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

main();
