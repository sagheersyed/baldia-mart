const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'baldia_mart',
  });

  await c.connect();
  console.log('Connected. Looking for orphaned CMS test data...');

  const res = await c.query("SELECT id, name FROM tenants WHERE name LIKE 'CMS Test%'");
  console.log('Found', res.rows.length, 'orphaned test tenant(s).');

  for (const row of res.rows) {
    await c.query('DELETE FROM audit_logs WHERE tenant_id = $1', [row.id]);
    await c.query('DELETE FROM change_requests WHERE tenant_id = $1', [row.id]);
    await c.query('DELETE FROM tenant_users WHERE tenant_id = $1', [row.id]);
    await c.query('DELETE FROM tenants WHERE id = $1', [row.id]);
    console.log('  Cleaned tenant:', row.id, '-', row.name);
  }

  // Clean orphaned test products & users
  await c.query("DELETE FROM products WHERE name = 'CMS Test Milk 1L'");
  await c.query("DELETE FROM users WHERE name = 'Test Merchant'");

  console.log('Cleanup complete.');
  await c.end();
}

main().catch(e => console.error(e));
