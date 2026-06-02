import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio credentials missing. SMS will only be logged to console.');
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.client) {
      this.logger.log(`[DEV-SMS] To: ${to} | Msg: ${message}`);
      return true;
    }

    try {
      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      this.logger.log(`SMS sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      return false;
    }
  }
}
