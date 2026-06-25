import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { WalletTransaction } from '../../wallets/wallet-transaction.entity';
import { FinancialLedgerEntry } from '../entities/financial-ledger-entry.entity';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { Logger } from '@nestjs/common';

/**
 * Migration Script: One-time backfill of legacy WalletTransaction data
 * into the new high-fidelity double-entry ledger format.
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

    const legacyTx = await runner.manager.find(WalletTransaction, {
      order: { createdAt: 'ASC' },
    });

    if (legacyTx.length === 0) {
      logger.log('No legacy transactions found. Skipping.');
      return;
    }

    logger.log(`Found ${legacyTx.length} legacy transactions to migrate.`);

    for (const tx of legacyTx) {
       // 1. Create a parent transaction for each legacy entry to maintain ledger integrity
       const parentTx = runner.manager.create(FinancialTransaction, {
          referenceType: 'LEGACY_MIGRATION',
          referenceId: tx.id,
          description: `Migrated from WalletTransaction: ${tx.description}`,
          createdAt: tx.createdAt
       });
       const savedParent = await runner.manager.save(parentTx);

       // 2. Create the ledger entry
       const entry = runner.manager.create(FinancialLedgerEntry, {
         transactionId: savedParent.id,
         walletId: tx.walletId,
         accountTag: 'EARNINGS',
         direction: tx.type as 'CREDIT' | 'DEBIT',
         amount: Number(tx.amount),
         description: tx.description,
         createdAt: tx.createdAt,
       });
       await runner.manager.save(entry);
    }
    
    logger.log('Migration successful.');
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
