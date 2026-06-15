import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { WalletTransaction } from '../../wallets/wallet-transaction.entity';
import { FinancialLedgerEntry } from '../entities/financial-ledger-entry.entity';
import { format } from 'date-fns';
import { Logger } from '@nestjs/common';

/**
 * Migration Script: One-time backfill of legacy WalletTransaction data
 * into the new high-fidelity FinancialLedgerEntry format.
 */
async function migrate() {
  const logger = new Logger('FinanceMigration');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const runner = dataSource.createQueryRunner();

  await runner.connect();
  await runner.startTransaction();

  try {
    logger.log('Starting legacy transaction migration...');

    // 1. Fetch all legacy transactions
    const legacyTx = await runner.manager.find(WalletTransaction, {
      order: { createdAt: 'ASC' },
    });

    if (legacyTx.length === 0) {
      logger.log('No legacy transactions found. Skipping.');
      return;
    }

    logger.log(`Found ${legacyTx.length} legacy transactions to migrate.`);

    // 2. Iterate and convert
    // Note: We don't recalculate running balance here because the old system
    // didn't support it reliably. Most will have 0 or current balance.
    const entries = legacyTx.map(tx => {
       return runner.manager.create(FinancialLedgerEntry, {
         walletId: tx.walletId,
         orderId: tx.orderId,
         entryType: 'MANUAL_ADJUSTMENT', // Legacy entries are treated as adjustments
         direction: tx.type, // 'CREDIT' or 'DEBIT' matches
         amount: tx.amount,
         runningBalance: 0, // Placeholder
         description: `[MIGRATED] ${tx.description}`,
         referenceId: tx.referenceId,
         adminId: tx.adminId,
         periodKey: format(tx.createdAt, 'yyyy-MM'),
         createdAt: tx.createdAt,
         metadata: { migratedFrom: 'WalletTransaction', legacyId: tx.id }
       });
    });

    // 3. Batch save
    await runner.manager.save(entries);
    
    logger.log('Migration successful. Record count: ' + entries.length);
    await runner.commitTransaction();
  } catch (err) {
    logger.error('Migration failed. Rolling back.', err.stack);
    await runner.rollbackTransaction();
  } finally {
    await runner.release();
    await app.close();
  }
}

migrate();
