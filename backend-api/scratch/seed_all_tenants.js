/**
 * seed_all_tenants.js
 * Seeds ALL existing vendors + restaurants as CMS Tenants.
 * Sets up approval rules for VendorProduct and MenuItem.
 * Safe to run multiple times (idempotent).
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'postgres', password: 'postgres',
    database: 'baldia_mart',
  });

  await client.connect();
  console.log('Connected to DB.\n');

  // ── 1. Vendors → grocery tenants ──────────────────────────────
  const vendors = await client.query('SELECT id, name FROM vendors WHERE is_active = true;');
  console.log(`Found ${vendors.rows.length} active vendors.`);

  for (const v of vendors.rows) {
    const existing = await client.query(
      "SELECT id FROM tenants WHERE entity_id = $1 AND type = 'grocery';",
      [v.id]
    );
    if (existing.rows.length > 0) {
      console.log(`  SKIP  Vendor tenant already exists: ${v.name}`);
      continue;
    }
    const tenantId = uuidv4();
    await client.query(
      "INSERT INTO tenants (id, name, type, status, entity_id, created_at, updated_at) VALUES ($1, $2, 'grocery', 'active', $3, NOW(), NOW());",
      [tenantId, v.name, v.id]
    );
    console.log(`  CREATE Vendor tenant: "${v.name}" → tenant ${tenantId}`);
  }

  // ── 2. Restaurants → restaurant tenants ───────────────────────
  const restaurants = await client.query('SELECT id, name FROM restaurants WHERE is_active = true;');
  console.log(`\nFound ${restaurants.rows.length} active restaurants.`);

  for (const r of restaurants.rows) {
    const existing = await client.query(
      "SELECT id FROM tenants WHERE entity_id = $1 AND type = 'restaurant';",
      [r.id]
    );
    if (existing.rows.length > 0) {
      console.log(`  SKIP  Restaurant tenant already exists: ${r.name}`);
      continue;
    }
    const tenantId = uuidv4();
    await client.query(
      "INSERT INTO tenants (id, name, type, status, entity_id, created_at, updated_at) VALUES ($1, $2, 'restaurant', 'active', $3, NOW(), NOW());",
      [tenantId, r.name, r.id]
    );
    console.log(`  CREATE Restaurant tenant: "${r.name}" → tenant ${tenantId}`);
  }

  // ── 3. Approval Rules ─────────────────────────────────────────
  console.log('\nSeeding approval rules...');
  const rules = [
    { entityType: 'VendorProduct', fieldName: 'price',     ruleType: 'percentage_change', ruleValue: { max_increase_percent: 10 }, description: 'Vendor price ≤10% auto-approved' },
    { entityType: 'VendorProduct', fieldName: 'stockQty',  ruleType: 'always_approve',    ruleValue: {},                           description: 'Stock qty always auto-approved' },
    { entityType: 'VendorProduct', fieldName: 'isAvailable', ruleType: 'always_approve',  ruleValue: {},                           description: 'Availability toggle always auto-approved' },
    { entityType: 'MenuItem',      fieldName: 'price',     ruleType: 'percentage_change', ruleValue: { max_increase_percent: 10 }, description: 'Menu price ≤10% auto-approved' },
    { entityType: 'MenuItem',      fieldName: 'isAvailable', ruleType: 'always_approve',  ruleValue: {},                           description: 'Menu availability always auto-approved' },
  ];

  for (const rule of rules) {
    const existing = await client.query(
      'SELECT id FROM approval_rules WHERE entity_type = $1 AND field_name = $2;',
      [rule.entityType, rule.fieldName]
    );
    if (existing.rows.length > 0) {
      console.log(`  SKIP  Rule already exists: ${rule.entityType}.${rule.fieldName}`);
      continue;
    }
    await client.query(
      'INSERT INTO approval_rules (id, entity_type, field_name, rule_type, rule_value, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW());',
      [uuidv4(), rule.entityType, rule.fieldName, rule.ruleType, JSON.stringify(rule.ruleValue), rule.description]
    );
    console.log(`  CREATE Rule: ${rule.entityType}.${rule.fieldName} → ${rule.ruleType}`);
  }

  // ── 4. Final Summary ──────────────────────────────────────────
  const summary = await client.query('SELECT type, COUNT(*) as count FROM tenants GROUP BY type;');
  console.log('\n=== TENANT SUMMARY ===');
  console.table(summary.rows);

  await client.end();
  console.log('\nDone! All tenants seeded.');
}

main().catch(e => { console.error(e); process.exit(1); });
