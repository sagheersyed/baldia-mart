import { Client } from 'pg';

async function seedRules() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'baldia_mart',
    password: 'postgres',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const rules = [
      ['PharmacyInventory', 'isAvailable', 'always_approve'],
      ['PharmacyInventory', 'stockQuantity', 'always_approve'],
      ['VendorProduct', 'isAvailable', 'always_approve'],
      ['VendorProduct', 'stockQty', 'always_approve'],
      ['MenuItem', 'isAvailable', 'always_approve'],
    ];

    for (const [entity, field, type] of rules) {
      // First delete existing to avoid duplicates if re-run
      await client.query(`DELETE FROM approval_rules WHERE entity_type = $1 AND field_name = $2`, [entity, field]);
      
      await client.query(`
        INSERT INTO approval_rules (entity_type, field_name, rule_type, is_active)
        VALUES ($1, $2, $3, true);
      `, [entity, field, type]);
      console.log(`Seeded rule for ${entity}.${field}`);
    }

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedRules();
