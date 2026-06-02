const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function run() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'baldia_mart',
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('DROP TABLE IF EXISTS favorites CASCADE;');
    console.log('Successfully dropped table "favorites".');
  } catch (err) {
    console.error('Failed to drop table:', err.message);
  } finally {
    await client.end();
  }
}

run();
