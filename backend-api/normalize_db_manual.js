const { Client } = require('pg');

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:5432/baldia_mart';

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('92')) {
    cleaned = '92' + cleaned;
  }
  return '+' + cleaned;
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to DB');

  try {
    // 1. Process Riders
    console.log('--- Processing Riders ---');
    const riders = await client.query('SELECT id, phone_number, name, is_profile_complete, total_earnings, mpin, is_active FROM riders');
    const riderGroups = {};
    for (const r of riders.rows) {
      const norm = normalizePhone(r.phone_number);
      if (!riderGroups[norm]) riderGroups[norm] = [];
      riderGroups[norm].push(r);
    }

    for (const [norm, group] of Object.entries(riderGroups)) {
      if (group.length > 1) {
        console.log(`Found ${group.length} duplicates for rider phone: ${norm}`);
        
        // Sort: profile complete first, then highest earnings
        group.sort((a, b) => {
          if (a.is_profile_complete !== b.is_profile_complete) return b.is_profile_complete ? -1 : 1;
          return Number(b.total_earnings) - Number(a.total_earnings);
        });

        const winner = group[0];
        const losers = group.slice(1);

        console.log(`Winning rider: ${winner.id} (${winner.name}), merging ${losers.length} duplicates`);

        for (const loser of losers) {
          if (!winner.mpin && loser.mpin) {
            console.log(`Preserving MPIN from loser ${loser.id} to winner ${winner.id}`);
            await client.query('UPDATE riders SET mpin = $1 WHERE id = $2', [loser.mpin, winner.id]);
            winner.mpin = loser.mpin;
          }
          if (loser.is_active && !winner.is_active) {
            console.log(`Preserving active status from loser ${loser.id} to winner ${winner.id}`);
            await client.query('UPDATE riders SET is_active = true WHERE id = $1', [winner.id]);
            winner.is_active = true;
          }
          await client.query('UPDATE orders SET rider_id = $1 WHERE rider_id = $2', [winner.id, loser.id]);
          await client.query('DELETE FROM riders WHERE id = $1', [loser.id]);
        }
        await client.query('UPDATE riders SET phone_number = $1 WHERE id = $2', [norm, winner.id]);
      } else {
        await client.query('UPDATE riders SET phone_number = $1 WHERE id = $2', [norm, group[0].id]);
      }
    }

    // 2. Process Users
    console.log('--- Processing Users ---');
    const users = await client.query('SELECT id, phone_number, name, mpin FROM users');
    const userGroups = {};
    for (const u of users.rows) {
      if (!u.phone_number) continue;
      const norm = normalizePhone(u.phone_number);
      if (!userGroups[norm]) userGroups[norm] = [];
      userGroups[norm].push(u);
    }

    for (const [norm, group] of Object.entries(userGroups)) {
      if (group.length > 1) {
        console.log(`Found ${group.length} duplicates for user phone: ${norm}`);
        
        // Winner is the first one (or preferably one with MPIN)
        group.sort((a, b) => (b.mpin ? 1 : 0) - (a.mpin ? 1 : 0));
        
        const winner = group[0];
        const losers = group.slice(1);

        console.log(`Winning user: ${winner.id} (${winner.name}), merging ${losers.length} duplicates`);

        for (const loser of losers) {
          if (!winner.mpin && loser.mpin) {
            console.log(`Preserving MPIN from loser ${loser.id} to winner ${winner.id}`);
            await client.query('UPDATE users SET mpin = $1 WHERE id = $2', [loser.mpin, winner.id]);
            winner.mpin = loser.mpin;
          }
          await client.query('UPDATE orders SET user_id = $1 WHERE user_id = $2', [winner.id, loser.id]);
          await client.query('DELETE FROM users WHERE id = $1', [loser.id]);
        }
        await client.query('UPDATE users SET phone_number = $1 WHERE id = $2', [norm, winner.id]);
      } else {
        await client.query('UPDATE users SET phone_number = $1 WHERE id = $2', [norm, group[0].id]);
      }
    }

    console.log('Normalization and Merging complete!');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}

run();
