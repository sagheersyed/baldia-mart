import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OrderChatMessage } from './order-chat-message.entity';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(OrderChatMessage)
    private chatMessageRepository: Repository<OrderChatMessage>,
  ) {}

  // Run every night at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleChatImageCleanup() {
    this.logger.log('Starting chat image cleanup (3-day retention policy)...');

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find messages with images older than 3 days
    const oldMessages = await this.chatMessageRepository.find({
      where: {
        createdAt: LessThan(threeDaysAgo),
        // We only care about cleanup for messages that have an imageUrl
      },
    });

    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const msg of oldMessages) {
      if (msg.imageUrl) {
        try {
          // Extract filename from URL (e.g., https://.../uploads/file.jpg -> file.jpg)
          const filename = msg.imageUrl.split('/').pop();
          if (filename) {
            const filePath = join(__dirname, '..', '..', 'public', 'uploads', filename);
            if (existsSync(filePath)) {
              unlinkSync(filePath);
              deletedFiles++;
            }
          }
        } catch (err) {
          this.logger.error(`Failed to delete file for message ${msg.id}: ${err.message}`);
        }
      }

      // Delete the message record from DB
      await this.chatMessageRepository.delete(msg.id);
      deletedRecords++;
    }

    if (deletedRecords > 0) {
      this.logger.log(`Cleanup completed: Deleted ${deletedRecords} messages and ${deletedFiles} image files.`);
    } else {
      this.logger.log('No old chat messages found for cleanup.');
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  async triggerManualCleanup() {
    return this.handleChatImageCleanup();
  }
}
