const { Client } = require('pg');

async function cleanup() {
  const client = new Client({
    user: 'postgres', host: 'localhost', database: 'baldia_mart', password: 'postgres', port: 5432
  });
  await client.connect();
  
  console.log('Cleaning up pharma data...');
  await client.query("DELETE FROM pharmacy_inventory");
  await client.query("DELETE FROM medicines");
  await client.query("DELETE FROM categories WHERE section = 'pharma'");
  
  console.log('Cleanup complete.');
  await client.end();
}

cleanup();
