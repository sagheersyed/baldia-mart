const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'baldia_mart',
    password: 'postgres',
    port: 5432
  });
  
  await client.connect();
  await client.query("INSERT INTO settings (key, value) VALUES ('feature_show_pharma', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'");
  console.log('Settings updated');
  await client.end();
}

run();
