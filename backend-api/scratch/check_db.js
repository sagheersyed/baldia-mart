const { Client } = require('pg');

async function check() {
  const client = new Client({
    user: 'postgres', host: 'localhost', database: 'baldia_mart', password: 'postgres', port: 5432
  });
  await client.connect();
  
  console.log('--- CATEGORIES ---');
  const catRes = await client.query("SELECT id, name, section FROM categories ORDER BY section, name");
  console.table(catRes.rows);

  console.log('--- MEDICINES ---');
  const medRes = await client.query("SELECT id, name, mrp FROM medicines ORDER BY name");
  console.table(medRes.rows);

  await client.end();
}

check();
