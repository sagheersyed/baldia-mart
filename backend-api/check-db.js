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
    console.log('Connected to DB');
    
    // Check inventory stock at pharmacies
    const stockRes = await client.query("SELECT * FROM pharmacy_inventory WHERE medicine_id = 'f421c7f8-351e-421b-8141-370cb078c88e'");
    console.log('Stock at pharmacies:');
    console.log(stockRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
