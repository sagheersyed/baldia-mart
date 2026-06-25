import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { FinancialLedgerEntry } from '../entities/financial-ledger-entry.entity';
import { Wallet } from '../../wallets/wallet.entity';
import { Logger } from '@nestjs/common';

/**
 * Technical Audit Script: Verifies the integrity of the double-entry financial system.
 */
async function audit() {
  const logger = new Logger('FinancialAudit');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    logger.log('--- STARTING COMPREHENSIVE FINANCIAL AUDIT ---');

    // 1. Transaction Balance Integrity Check
    // In a double-entry system, Sum(CREDITS) - Sum(DEBITS) must be ZERO for every transaction.
    // Note: In our implementation, we store amount as absolute, so we check if CreditSum == DebitSum.
    const unbalancedTx = await dataSource.query(`
      SELECT 
        transaction_id,
        SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) as credits,
        SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) as debits
      FROM financial_ledger_entries
      GROUP BY transaction_id
      HAVING SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) <> SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END)
    `);

    if (unbalancedTx.length > 0) {
      logger.error(`❌ CRITICAL: Found ${unbalancedTx.length} unbalanced transactions!`);
      console.table(unbalancedTx);
    } else {
      logger.log('✅ PASS: All ledger transactions are perfectly balanced (Credits == Debits).');
    }

    // 2. Wallet-Ledger Reconciliation
    // The balance stored in the Wallet entity MUST match the aggregate of its ledger EARNINGS entries.
    // The cashInHand stored in the Wallet entity MUST match the aggregate of its ledger CASH_IN_HAND entries.
    const wallets = await dataSource.getRepository(Wallet).find();
    let discrepancies = 0;

    for (const wallet of wallets) {
      const stats = await dataSource.query(`
        SELECT 
           SUM(CASE WHEN account_tag = 'EARNINGS' AND direction = 'CREDIT' THEN amount ELSE 0 END) -
           SUM(CASE WHEN account_tag = 'EARNINGS' AND direction = 'DEBIT' THEN amount ELSE 0 END) as calculated_balance,
           SUM(CASE WHEN account_tag = 'CASH_IN_HAND' AND direction = 'DEBIT' THEN amount ELSE 0 END) -
           SUM(CASE WHEN account_tag = 'CASH_IN_HAND' AND direction = 'CREDIT' THEN amount ELSE 0 END) as calculated_cash
        FROM financial_ledger_entries
        WHERE wallet_id = $1
      `, [wallet.id]);

      const calcBalance = Number(stats[0].calculated_balance || 0);
      const calcCash = Number(stats[0].calculated_cash || 0);

      const balanceDiff = Math.abs(Number(wallet.balance) - calcBalance);
      const cashDiff = Math.abs(Number(wallet.cashInHand) - calcCash);

      if (balanceDiff > 0.01 || cashDiff > 0.01) {
        logger.warn(`⚠️ DISCREPANCY: Wallet ${wallet.id} (${wallet.userType})`);
        logger.warn(`   Stored Balance: ${wallet.balance} | Ledger: ${calcBalance} | Diff: ${balanceDiff}`);
        logger.warn(`   Stored Cash: ${wallet.cashInHand} | Ledger: ${calcCash} | Diff: ${cashDiff}`);
        discrepancies++;
      }
    }

    if (discrepancies === 0) {
      logger.log('✅ PASS: All wallets are perfectly reconciled with the ledger.');
    } else {
      logger.error(`❌ FAILED: Found ${discrepancies} wallet discrepancies.`);
    }

    // 3. Platform Revenue Audit (Including Voucher Leakage Check)
    const platformRev = await dataSource.query(`
      SELECT 
        SUM(CASE WHEN account_tag = 'PLATFORM_REV' THEN amount ELSE 0 END) as gross_commission,
        SUM(CASE WHEN account_tag = 'VOUCHER_EXP' THEN amount ELSE 0 END) as total_voucher_cost,
        SUM(CASE WHEN account_tag = 'PLATFORM_REV' THEN amount ELSE 0 END) - 
        SUM(CASE WHEN account_tag = 'VOUCHER_EXP' THEN amount ELSE 0 END) as net_platform_profit
      FROM financial_ledger_entries
    `);

    logger.log('--- REVENUE SUMMARY ---');
    console.table(platformRev);

    logger.log('--- AUDIT COMPLETED ---');
  } catch (err) {
    logger.error('Audit failed to execute.', err.stack);
  } finally {
    await app.close();
  }
}

audit();
