import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cash-on-Pick financial flow:
 * - Merchant allowsCreditOrders flag (default false = rider pays at pickup)
 * - Pickup payment confirmation on orders / sub_orders
 * - COMMISSION_PAYABLE ledger account tag
 * - Default cash_flow_mode = CASH_ON_PICK
 */
export class CashOnPickFlow1739200000000 implements MigrationInterface {
  name = 'CashOnPickFlow1739200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Merchant credit policy ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE vendors
        ADD COLUMN IF NOT EXISTS allows_credit_orders boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE restaurants
        ADD COLUMN IF NOT EXISTS allows_credit_orders boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE pharmacies
        ADD COLUMN IF NOT EXISTS allows_credit_orders boolean NOT NULL DEFAULT false;
    `);

    // ── Order pickup payment tracking ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS pickup_payment_status varchar NOT NULL DEFAULT 'pending';
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS pickup_payment_amount decimal(10,2);
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS pickup_payment_confirmed_at timestamp;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS pickup_payment_confirmed_by uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE sub_orders
        ADD COLUMN IF NOT EXISTS pickup_payment_status varchar NOT NULL DEFAULT 'pending';
    `);
    await queryRunner.query(`
      ALTER TABLE sub_orders
        ADD COLUMN IF NOT EXISTS pickup_payment_amount decimal(10,2);
    `);
    await queryRunner.query(`
      ALTER TABLE sub_orders
        ADD COLUMN IF NOT EXISTS pickup_payment_confirmed_at timestamp;
    `);
    await queryRunner.query(`
      ALTER TABLE sub_orders
        ADD COLUMN IF NOT EXISTS pickup_payment_confirmed_by uuid;
    `);

    // ── Default cash flow mode ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE orders
        ALTER COLUMN cash_flow_mode SET DEFAULT 'CASH_ON_PICK';
    `);

    // Backfill active orders still on legacy default
    await queryRunner.query(`
      UPDATE orders
      SET cash_flow_mode = 'CASH_ON_PICK'
      WHERE cash_flow_mode = 'MERCHANT_CREDIT'
        AND status NOT IN ('delivered', 'cancelled');
    `);

    // ── Ledger enum: COMMISSION_PAYABLE ─────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE financial_ledger_entries_account_tag_enum
          ADD VALUE IF NOT EXISTS 'COMMISSION_PAYABLE';
      EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN undefined_object THEN
          BEGIN
            ALTER TYPE "financial_ledger_entries_account_tag_enum"
              ADD VALUE IF NOT EXISTS 'COMMISSION_PAYABLE';
          EXCEPTION WHEN duplicate_object THEN null;
          END;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sub_orders DROP COLUMN IF EXISTS pickup_payment_confirmed_by;`);
    await queryRunner.query(`ALTER TABLE sub_orders DROP COLUMN IF EXISTS pickup_payment_confirmed_at;`);
    await queryRunner.query(`ALTER TABLE sub_orders DROP COLUMN IF EXISTS pickup_payment_amount;`);
    await queryRunner.query(`ALTER TABLE sub_orders DROP COLUMN IF EXISTS pickup_payment_status;`);

    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS pickup_payment_confirmed_by;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS pickup_payment_confirmed_at;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS pickup_payment_amount;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS pickup_payment_status;`);

    await queryRunner.query(`ALTER TABLE pharmacies DROP COLUMN IF EXISTS allows_credit_orders;`);
    await queryRunner.query(`ALTER TABLE restaurants DROP COLUMN IF EXISTS allows_credit_orders;`);
    await queryRunner.query(`ALTER TABLE vendors DROP COLUMN IF EXISTS allows_credit_orders;`);

    await queryRunner.query(`
      ALTER TABLE orders ALTER COLUMN cash_flow_mode SET DEFAULT 'MERCHANT_CREDIT';
    `);
  }
}
