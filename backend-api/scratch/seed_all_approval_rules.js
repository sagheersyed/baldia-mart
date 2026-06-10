const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
async function main() {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'baldia_mart' });
  try {
    await client.connect();
    const rules = [
      { entityType: 'VendorProduct', fieldName: 'price', ruleType: 'percentage_change', ruleValue: { max_increase_percent: 10 }, description: 'Price changes within 10% auto-approved' },
      { entityType: 'VendorProduct', fieldName: 'stockQty', ruleType: 'always_approve', ruleValue: {}, description: 'Stock always auto-approved' },
      { entityType: 'VendorProduct', fieldName: 'isAvailable', ruleType: 'always_approve', ruleValue: {}, description: 'Availability always auto-approved' },
      { entityType: 'MenuItem', fieldName: 'price', ruleType: 'percentage_change', ruleValue: { max_increase_percent: 10 }, description: 'Price changes within 10% auto-approved' },
      { entityType: 'MenuItem', fieldName: 'isAvailable', ruleType: 'always_approve', ruleValue: {}, description: 'Availability always auto-approved' },
      { entityType: 'PharmacyMedicine', fieldName: 'priceOverride', ruleType: 'percentage_change', ruleValue: { max_increase_percent: 10 }, description: 'Price override within 10% auto-approved' },
      { entityType: 'PharmacyMedicine', fieldName: 'stockQuantity', ruleType: 'always_approve', ruleValue: {}, description: 'Stock always auto-approved' },
      { entityType: 'PharmacyMedicine', fieldName: 'isActive', ruleType: 'always_approve', ruleValue: {}, description: 'Availability always auto-approved' },
    ];
    await client.query('DELETE FROM approval_rules;');
    for (const r of rules) {
      await client.query('INSERT INTO approval_rules (id,entity_type,field_name,rule_type,rule_value,description,is_active,created_at) VALUES ($1,$2,$3,$4,$5,$6,true,NOW())', [uuidv4(), r.entityType, r.fieldName, r.ruleType, JSON.stringify(r.ruleValue), r.description]);
      console.log('+ ' + r.entityType + '.' + r.fieldName + ' -> ' + r.ruleType);
    }
    await client.query('ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS cms_pin VARCHAR(255) DEFAULT NULL');
    console.log('+ cms_pin column added to tenant_users');
    console.log('Done! ' + rules.length + ' rules seeded.');
  } catch (e) { console.error(e); } finally { await client.end(); }
}
main();
