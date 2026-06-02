const { Client } = require('pg');
(async () => {
  const client = new Client({
    host: '127.0.0.1',
    user: 'postgres',
    password: 'postgres',
    database: 'baldia_mart'
  });
  try {
    await client.connect();
    const id = '68434188-3e79-4d26-bcd4-c1109d69ea84';
    await client.query(`
      INSERT INTO riders (id, name, email, phone_number, firebase_uid, is_active, is_profile_complete, is_online)
      VALUES ($1, $2, $3, $4, $5, true, true, false)
      ON CONFLICT (id) DO NOTHING
    `, [id, 'Test Rider', 'test.rider@baldia.mart', '+923331234567', 'test-rider-uid']);
    console.log('Rider created/verified');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
