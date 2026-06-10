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
    const crs = await client.query('SELECT id, status, entity_type, action_type, created_at, rejection_reason FROM change_requests ORDER BY created_at DESC LIMIT 10;');
    console.table(crs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
