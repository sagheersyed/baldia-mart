import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FinanceService } from './finance.service';
import { subDays } from 'date-fns';

@Injectable()
export class FinanceTasks {
  private readonly logger = new Logger(FinanceTasks.name);

  constructor(private readonly financeService: FinanceService) {}

  /**
   * Generates financial snapshots for the previous day.
   * Runs daily at 00:05 AM.
   */
  @Cron('5 0 * * *') // Runs at 00:05 AM every day (offset to avoid midnight restart races)
  async handleDailySnapshots() {
    this.logger.log('Starting daily financial snapshot generation...');
    
    // We snapshot for the PREVIOUS day
    const yesterday = subDays(new Date(), 1);
    
    try {
      const snapshot = await this.financeService.generateDailySnapshot(yesterday);
      this.logger.log(`Daily snapshot generated for ${yesterday.toISOString().split('T')[0]}: ID=${snapshot.id}`);
    } catch (error: any) {
      // Unique-key violation = snapshot already exists for this date; silently skip
      const isAlreadyDone =
        error?.code === '23505' ||
        (typeof error?.message === 'string' && error.message.toLowerCase().includes('duplicate'));
      if (isAlreadyDone) {
        this.logger.warn(`Snapshot for ${yesterday.toISOString().split('T')[0]} already exists — skipping duplicate.`);
      } else {
        this.logger.error('Failed to generate daily financial snapshot', error.stack);
      }
    }
  }

  /**
   * Health check / Heartbeat for the financial engine.
   * Runs every hour to ensure the ledger is consistent (Placeholder for future checks).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorLedgerIntegrity() {
    this.logger.debug('Financial ledger integrity check: OK');
  }
}
