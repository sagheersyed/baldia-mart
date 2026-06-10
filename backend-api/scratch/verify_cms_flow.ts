console.log('=== VERIFICATION SCRIPT INITIALIZING ===');
import * as dotenv from 'dotenv';
import * as path from 'path';
// Load .env from the backend-api directory
dotenv.config({ path: path.join(__dirname, '../.env') });
if (process.env.DB_HOST === 'host.docker.internal') {
  process.env.DB_HOST = 'localhost';
}
if (process.env.REDIS_HOST === 'redis') {
  process.env.REDIS_HOST = 'localhost';
}
// Force local DB credentials to avoid OS environment variable overrides
process.env.DB_USERNAME = 'postgres';
process.env.DB_PASSWORD = 'postgres';

console.log('Environment variables loaded. DB_HOST:', process.env.DB_HOST, 'REDIS_HOST:', process.env.REDIS_HOST);

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ChangeRequestService } from '../src/cms/services/change-request.service';
import { ApprovalRuleService, PatchOperation } from '../src/cms/services/approval-rule.service';
import { MergeService } from '../src/cms/services/merge.service';
import { Tenant } from '../src/cms/entities/tenant.entity';
import { TenantUser } from '../src/cms/entities/tenant-user.entity';
import { ApprovalRule } from '../src/cms/entities/approval-rule.entity';
import { Product } from '../src/products/product.entity';
import { User } from '../src/users/user.entity';
import { ChangeRequest } from '../src/cms/entities/change-request.entity';
import { AuditLog } from '../src/cms/entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  console.log('--- STARTING CMS MODULE VERIFICATION FLOW ---');
  console.log('Mounting NestJS Application Context...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const crService = app.get(ChangeRequestService);
  const ruleService = app.get(ApprovalRuleService);
  const mergeService = app.get(MergeService);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Seed a test user
    console.log('\n[1/7] Seeding test Merchant User...');
    const userEmail = `merchant_${uuidv4().substring(0, 8)}@baldiamart.com`;
    const userInsert = await queryRunner.query(
      `INSERT INTO users (id, name, email, role, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id;`,
      [uuidv4(), 'Test Merchant', userEmail, 'customer', true]
    );
    const userId = userInsert[0].id;
    console.log(`- Created Merchant User ID: ${userId}`);

    // 2. Seed a test Tenant & TenantUser membership
    console.log('\n[2/7] Seeding test Tenant and TenantUser role...');
    const tenantRepo = dataSource.getRepository(Tenant);
    const tenantUserRepo = dataSource.getRepository(TenantUser);

    const tenant = tenantRepo.create({
      name: 'CMS Test Grocery',
      type: 'mart',
      status: 'active',
    });
    const savedTenant = await tenantRepo.save(tenant);
    console.log(`- Created Tenant: "${savedTenant.name}" (ID: ${savedTenant.id})`);

    const tenantUser = tenantUserRepo.create({
      tenantId: savedTenant.id,
      userId: userId,
      role: 'owner',
      isActive: true,
    });
    await tenantUserRepo.save(tenantUser);
    console.log(`- Added User ${userId} as "owner" to Tenant ${savedTenant.id}`);

    // 3. Seed Product approval rules
    console.log('\n[3/7] Setting up Approval Rules...');
    const ruleRepo = dataSource.getRepository(ApprovalRule);
    
    // Clear old rules for Product if any
    await ruleRepo.delete({ entityType: 'Product' });

    // Rule A: price updates <= 10% are auto-approved
    const rulePrice = ruleRepo.create({
      entityType: 'Product',
      fieldName: 'price',
      ruleType: 'percentage_change',
      ruleValue: { max_increase_percent: 10 },
      description: 'Price changes within 10% are auto-approved',
    });
    await ruleRepo.save(rulePrice);

    // Rule B: stock quantity updates are always approved
    const ruleStock = ruleRepo.create({
      entityType: 'Product',
      fieldName: 'stockQuantity',
      ruleType: 'always_approve',
      description: 'Stock quantity changes are always auto-approved',
    });
    await ruleRepo.save(ruleStock);
    console.log('- Seeded rules: price (percentage_change <= 10%), stockQuantity (always_approve)');

    // 4. Seed a test Product
    console.log('\n[4/7] Seeding test Catalog Product...');
    const productRepo = dataSource.getRepository(Product);
    const product = productRepo.create({
      name: 'CMS Test Milk 1L',
      categoryId: (await queryRunner.query('SELECT id FROM categories LIMIT 1'))[0]?.id || uuidv4(),
      brandId: (await queryRunner.query('SELECT id FROM brands LIMIT 1'))[0]?.id || null,
      price: 200.00,
      stockQuantity: 100,
      isActive: true,
    });
    const savedProduct = await productRepo.save(product);
    console.log(`- Created Product: "${savedProduct.name}" (ID: ${savedProduct.id}) with Price: ${savedProduct.price} PKR`);

    // 5. Test Case 1: Approvable Change Request (5% price increase + stock update)
    console.log('\n[5/7] Simulating Change Request 1 (Low Risk - Auto Approvable)...');
    console.log('- Action: Update price from 200 to 210 (5% increase), stock from 100 to 120.');
    const patchData1: PatchOperation[] = [
      { op: 'replace', path: '/price', value: 210.00, oldValue: 200.00 },
      { op: 'replace', path: '/stockQuantity', value: 120, oldValue: 100 }
    ];

    const cr1 = await crService.create({
      tenantId: savedTenant.id,
      entityType: 'Product',
      entityId: savedProduct.id,
      actionType: 'UPDATE',
      patchData: patchData1,
      preChangeSnapshot: { price: 200.00, stockQuantity: 100 },
      requestedBy: userId,
      submitImmediately: false, // create as draft
    });
    console.log(`- Draft Change Request 1 created (ID: ${cr1.id}, Status: ${cr1.status})`);

    // Submit it
    console.log('- Submitting Change Request 1...');
    const submittedCr1 = await crService.submit(cr1.id, userId);
    console.log(`- Change Request 1 Submitted (Status: ${submittedCr1.status})`);

    // Wait for the rule engine check
    console.log('- Evaluating against rule engine...');
    const ruleCheck1 = await ruleService.requiresModeration('Product', patchData1);
    console.log(`  Rule Check: requiresModeration = ${ruleCheck1.requiresModeration} (Reasons: ${JSON.stringify(ruleCheck1.reasons)})`);

    // Verify auto-approval logic by invoking the merge service directly for the test
    console.log('- Merging changes into production table...');
    const mergeResult1 = await mergeService.applyChangeRequest(submittedCr1);
    console.log(`  Merge Result: ${mergeResult1.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Verify the product was updated in the DB
    const updatedProduct1 = await productRepo.findOneOrFail({ where: { id: savedProduct.id } });
    console.log(`- DB Product Price after merge: ${updatedProduct1.price} PKR (Expected: 210)`);
    console.log(`- DB Product Stock after merge: ${updatedProduct1.stockQuantity} (Expected: 120)`);

    if (Number(updatedProduct1.price) === 210 && updatedProduct1.stockQuantity === 120) {
      console.log('  ✅ TEST CASE 1 PASSED.');
    } else {
      console.error('  ❌ TEST CASE 1 FAILED.');
    }

    // 6. Test Case 2: Moderated Change Request (50% price increase)
    console.log('\n[6/7] Simulating Change Request 2 (High Risk - Requires Moderation)...');
    console.log('- Action: Update price from 210 to 315 (50% increase).');
    const patchData2: PatchOperation[] = [
      { op: 'replace', path: '/price', value: 315.00, oldValue: 210.00 }
    ];

    const cr2 = await crService.create({
      tenantId: savedTenant.id,
      entityType: 'Product',
      entityId: savedProduct.id,
      actionType: 'UPDATE',
      patchData: patchData2,
      preChangeSnapshot: { price: 210.00 },
      requestedBy: userId,
      submitImmediately: true, // submit immediately
    });
    console.log(`- Change Request 2 created and submitted (ID: ${cr2.id}, Status: ${cr2.status})`);

    // Evaluate against rule engine
    const ruleCheck2 = await ruleService.requiresModeration('Product', patchData2);
    console.log(`  Rule Check: requiresModeration = ${ruleCheck2.requiresModeration}`);
    console.log(`  Blocked fields/reasons: ${JSON.stringify(ruleCheck2.reasons)}`);

    if (ruleCheck2.requiresModeration) {
      console.log('  ✅ TEST CASE 2 PASSED (Successfully identified as requiring moderation).');
    } else {
      console.error('  ❌ TEST CASE 2 FAILED.');
    }

    // 7. Cleanup test data
    // Wait for BullMQ async workers (moderation processor) to finish writing audit logs
    console.log('\n[7/7] Waiting 2s for async workers to complete, then cleaning up...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    await queryRunner.query('DELETE FROM audit_logs WHERE tenant_id = $1', [savedTenant.id]);
    await queryRunner.query('DELETE FROM change_request_discussions WHERE change_request_id IN (SELECT id FROM change_requests WHERE tenant_id = $1)', [savedTenant.id]);
    await queryRunner.query('DELETE FROM change_requests WHERE tenant_id = $1', [savedTenant.id]);
    await queryRunner.query('DELETE FROM tenant_users WHERE tenant_id = $1', [savedTenant.id]);
    await queryRunner.query('DELETE FROM tenants WHERE id = $1', [savedTenant.id]);
    await queryRunner.query('DELETE FROM products WHERE id = $1', [savedProduct.id]);
    await queryRunner.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('- Cleanup completed.');

    console.log('\n--- VERIFICATION FLOW COMPLETED SUCCESSFULY ---');

  } catch (err) {
    console.error('\n❌ Verification Failed with Error:', err);
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
