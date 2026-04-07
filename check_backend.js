const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'baldia_mart',
});

async function dropTable() {
  try {
    await client.connect();
    console.log('Connected to database');
    await client.query('DROP TABLE IF EXISTS favorites CASCADE;');
    console.log('Table "favorites" dropped successfully.');
  } catch (err) {
    console.error('Error dropping table:', err);
  } finally {
    await client.end();
  }
}

dropTable();
