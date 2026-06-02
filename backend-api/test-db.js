const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'baldia_mart',
  });

  try {
    await client.connect();
    console.log('Successfully connected to DB');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

test();
