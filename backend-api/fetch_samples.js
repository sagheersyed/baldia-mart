const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  database: 'baldia_mart',
  port: 5432,
});

async function run() {
  try {
    await client.connect();
    const tables = ['users', 'riders', 'products', 'categories', 'restaurants', 'orders'];
    const results = {};
    for (const table of tables) {
      const res = await client.query(`SELECT * FROM "${table}" LIMIT 1`);
      results[table] = res.rows[0] || null;
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

run();
