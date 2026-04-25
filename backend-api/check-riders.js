const { Client } = require('pg');
const dbConfig = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'baldia_mart' };

async function checkRiders() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const res = await client.query('SELECT id, name, phone_number FROM riders');
    console.log('--- RIDERS IN DB ---');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkRiders();
