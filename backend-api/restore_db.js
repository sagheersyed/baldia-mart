
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function restore() {
  const adminConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  };

  const dbName = 'baldia_mart';
  const dumpPath = path.join(__dirname, '..', 'full_dump.sql');

  const client = new Client(adminConfig);

  try {
    await client.connect();
    console.log('Connected to postgres admin database.');

    // 1. Terminate connections
    console.log(`Terminating connections to ${dbName}...`);
    await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid();
    `, [dbName]);

    // 2. Drop and Recreate
    console.log(`Dropping database ${dbName}...`);
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Creating database ${dbName}...`);
    await client.query(`CREATE DATABASE ${dbName}`);
    
    await client.end();

    // 3. Connect to new database and run dump
    console.log(`Connecting to ${dbName} to restore data...`);
    const dbClient = new Client({ ...adminConfig, database: dbName });
    await dbClient.connect();

    console.log('Reading dump file...');
    const sql = fs.readFileSync(dumpPath, 'utf8');
    
    console.log('Executing restoration SQL (this may take a minute)...');
    // Using a simple query for now. If it's too big, we might need a different approach.
    // Standard pg client can handle large strings but might hit memory limits.
    await dbClient.query(sql);
    
    console.log('Restoration completed successfully.');
    await dbClient.end();

  } catch (err) {
    console.error('Restoration failed:', err.message);
    process.exit(1);
  }
}

restore();
