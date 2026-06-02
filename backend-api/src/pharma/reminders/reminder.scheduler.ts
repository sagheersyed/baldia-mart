import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MedicineReminder } from './medicine-reminder.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    @InjectRepository(MedicineReminder)
    private reminderRepository: Repository<MedicineReminder>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    this.logger.debug('Running medicine reminders check...');
    
    const now = new Date();
    const currentHHMM = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    // 1. Fetch all active reminders
    const activeReminders = await this.reminderRepository.find({
      where: { isActive: true },
      relations: ['user'],
    });

    const dueReminders = activeReminders.filter(reminder => {
      // Check if current date is within reminder range
      const startDate = new Date(reminder.startDate);
      if (now < startDate) return false;
      if (reminder.endDate && now > new Date(reminder.endDate)) return false;

      // Check if current time matches any of the reminder times
      return reminder.times.some(time => time === currentHHMM);
    });

    if (dueReminders.length === 0) return;

    this.logger.log(`Found ${dueReminders.length} reminders to trigger for ${currentHHMM}`);

    for (const reminder of dueReminders) {
      if (!reminder.user || !reminder.user.fcmToken) {
        this.logger.warn(`User for reminder ${reminder.id} has no FCM token. Skipping.`);
        continue;
      }

      const title = 'Medicine Reminder 💊';
      const body = `It's time to take ${reminder.medicineName}${reminder.dosage ? ` (${reminder.dosage})` : ''}. Stay healthy!`;

      try {
        await this.notificationsService.sendToUser(
          reminder.userId,
          reminder.user.fcmToken,
          title,
          body
        );
        this.logger.log(`Notification sent to user ${reminder.userId} for medicine ${reminder.medicineName}`);
      } catch (err) {
        this.logger.error(`Failed to send reminder for ${reminder.id}:`, err);
      }
    }
  }
}
