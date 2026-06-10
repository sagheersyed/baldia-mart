const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

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
    console.log('Connected to DB.');

    // 1. Get Syed Sagheer User
    const userRes = await client.query("SELECT id FROM users WHERE phone_number = '+923412248616';");
    if (userRes.rows.length === 0) {
      throw new Error("User 'Syed Sagheer' with phone +923412248616 not found.");
    }
    const userId = userRes.rows[0].id;
    console.log(`Found User 'Syed Sagheer' ID: ${userId}`);

    // 2. Get Baldia Super Market Vendor
    const vendorRes = await client.query("SELECT id FROM vendors WHERE name = 'Baldia Super Market';");
    if (vendorRes.rows.length === 0) {
      throw new Error("Vendor 'Baldia Super Market' not found.");
    }
    const vendorId = vendorRes.rows[0].id;
    console.log(`Found Vendor 'Baldia Super Market' ID: ${vendorId}`);

    // 3. Insert or Get Tenant
    let tenantId;
    const existingTenant = await client.query('SELECT id FROM tenants WHERE entity_id = $1;', [vendorId]);
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log(`Tenant already exists for Baldia Super Market. ID: ${tenantId}`);
    } else {
      tenantId = uuidv4();
      await client.query(
        'INSERT INTO tenants (id, name, type, status, entity_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW());',
        [tenantId, 'Baldia Super Market', 'grocery', 'active', vendorId]
      );
      console.log(`Created new Tenant for Baldia Super Market. ID: ${tenantId}`);
    }

    // 4. Link User to Tenant as Owner
    const existingMembership = await client.query(
      'SELECT id FROM tenant_users WHERE tenant_id = $1 AND user_id = $2;',
      [tenantId, userId]
    );
    if (existingMembership.rows.length > 0) {
      console.log('User already mapped as owner of this tenant.');
    } else {
      const membershipId = uuidv4();
      await client.query(
        'INSERT INTO tenant_users (id, tenant_id, user_id, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW());',
        [membershipId, tenantId, userId, 'owner', true]
      );
      console.log(`Added user Syed Sagheer as 'owner' of Tenant ${tenantId}`);
    }

    // 5. Seed Approval Rules for 'VendorProduct' if they don't exist
    const rulesToCheck = [
      {
        fieldName: 'price',
        ruleType: 'percentage_change',
        ruleValue: { max_increase_percent: 10 },
        description: 'Price changes within 10% are auto-approved'
      },
      {
        fieldName: 'stockQty',
        ruleType: 'always_approve',
        ruleValue: {},
        description: 'Stock quantity changes are always auto-approved'
      }
    ];

    for (const rule of rulesToCheck) {
      const existingRule = await client.query(
        "SELECT id FROM approval_rules WHERE entity_type = 'VendorProduct' AND field_name = $1;",
        [rule.fieldName]
      );
      if (existingRule.rows.length === 0) {
        const ruleId = uuidv4();
        await client.query(
          "INSERT INTO approval_rules (id, entity_type, field_name, rule_type, rule_value, description, created_at) VALUES ($1, 'VendorProduct', $2, $3, $4, $5, NOW());",
          [ruleId, rule.fieldName, rule.ruleType, JSON.stringify(rule.ruleValue), rule.description]
        );
        console.log(`Seeded Approval Rule for VendorProduct.${rule.fieldName}`);
      } else {
        console.log(`Approval Rule for VendorProduct.${rule.fieldName} already exists.`);
      }
    }

    console.log('\nAll done! User is now configured with Merchant Owner permissions.');

  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    await client.end();
  }
}

main();
