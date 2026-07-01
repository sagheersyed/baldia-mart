import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { FinancialTransaction } from './entities/financial-transaction.entity';
import { CommissionConfig } from './entities/commission-config.entity';
import { SettlementPeriod } from './entities/settlement-period.entity';
import { DailyFinancialSnapshot } from './entities/daily-financial-snapshot.entity';
import { Wallet } from '../wallets/wallet.entity';

import { FinanceController } from './finance.controller';
import { FinanceTasks } from './finance.tasks';
import {
  PremiumFinancialLedgerEntry,
  PremiumCommissionConfig,
  FinanceManagementService,
  FinancePremiumController,
} from './finance-engine-premium';

import { SettingsModule } from '../settings/settings.module';
import { WalletsModule } from '../wallets/wallets.module';
import { CmsModule } from '../cms/cms.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialLedgerEntry,
      FinancialTransaction,
      CommissionConfig,
      SettlementPeriod,
      DailyFinancialSnapshot,
      Wallet,
      PremiumFinancialLedgerEntry,
      PremiumCommissionConfig,
    ]),
    SettingsModule,
    forwardRef(() => WalletsModule),
    forwardRef(() => CmsModule),
  ],
  controllers: [FinanceController, FinancePremiumController],
  providers: [FinanceService, FinanceTasks, FinanceManagementService],
  exports: [FinanceService, FinanceManagementService],
})
export class FinanceModule {}
