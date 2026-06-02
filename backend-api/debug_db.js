const { Client } = require('pg');

async function debugDB() {
  const client = new Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/baldia_mart" });
  await client.connect();
  const res = await client.query("SELECT id, name, stock_quantity FROM products WHERE id = 'b5f32d91-8f6b-46c0-aad9-84a20dd19be5'");
  console.log("DB Product State:", res.rows[0]);
  
  const orderCount = await client.query("SELECT count(*) FROM orders WHERE notes LIKE '%Race fix verification%'");
  console.log("Orders with Race fix notes:", orderCount.rows[0].count);
  
  await client.end();
}

debugDB().catch(console.error);
