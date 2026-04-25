const { Client } = require('pg');
const dbConfig = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'baldia_mart' };

async function checkActiveOrders() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const res = await client.query('SELECT id, status, rider_id, user_id FROM orders WHERE status NOT IN (\'delivered\', \'cancelled\')');
    console.log('--- ACTIVE ORDERS IN DB ---');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkActiveOrders();
