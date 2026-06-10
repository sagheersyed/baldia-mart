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
    console.log('Successfully connected to Postgres DB on localhost:5432.\n');

    const tablesToCheck = [
      'tenants',
      'tenant_users',
      'change_requests',
      'change_request_discussions',
      'approval_rules',
      'audit_logs'
    ];

    console.log('Checking table existences:');
    for (const table of tablesToCheck) {
      const res = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );`,
        [table]
      );
      const exists = res.rows[0].exists;
      console.log(`- Table "${table}": ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

  } catch (err) {
    console.error('Error connecting or querying database:', err);
  } finally {
    await client.end();
  }
}

main();
