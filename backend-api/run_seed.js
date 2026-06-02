
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSeed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'baldia_mart',
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Adjusting path to reach root database folder
    const sqlPath = path.join(__dirname, '..', 'database', 'seed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing seed.sql...');
    await client.query(sql);
    console.log('Seeding completed successfully.');

    await client.end();
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

runSeed();
