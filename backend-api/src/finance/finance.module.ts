import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { CommissionConfig } from './entities/commission-config.entity';
import { SettlementPeriod } from './entities/settlement-period.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { Wallet } from '../wallets/wallet.entity';

import { FinanceController } from './finance.controller';
import { FinanceTasks } from './finance.tasks';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialLedgerEntry,
      CommissionConfig,
      SettlementPeriod,
      DailyFinancialSnapshot,
      Wallet,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceTasks],
  exports: [FinanceService],
})
export class FinanceModule {}
