const { Client } = require('pg');

async function checkStats() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/baldia_mart"
  });
  
  try {
    await client.connect();
    
    // 1. Connection Count
    const connRes = await client.query("SELECT count(*) FROM pg_stat_activity;");
    const count = connRes.rows[0].count;
    
    // 2. Slow Queries
    const slowRes = await client.query("SELECT query, duration FROM (SELECT query, now() - query_start AS duration FROM pg_stat_activity WHERE state = 'active') as q WHERE duration > interval '1 second';");
    
    console.log(`--- DB STATS ---`);
    console.log(`Current PG Connections: ${count}`);
    console.log(`Active Slow Queries (>1s): ${slowRes.rows.length}`);
    if (slowRes.rows.length > 0) {
      console.log(JSON.stringify(slowRes.rows, null, 2));
    }
    
    await client.end();
  } catch (err) {
    console.error("Error checking DB stats:", err.message);
  }
}

checkStats();
