import {
  Injectable, BadRequestException, HttpException, HttpStatus, Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Otp } from './otp.entity';
import * as bcrypt from 'bcryptjs';
import { SmsService } from './sms.service';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS_PER_HOUR = 25;
const OTP_DIGITS = 6;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private smsService: SmsService,
  ) { }

  private formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.trim();
    if (cleaned.startsWith('0')) {
      return '+92' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    return cleaned;
  }

  async sendOtp(phoneNumber: string): Promise<{ message: string }> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.otpRepository.count({
      where: { phoneNumber, createdAt: MoreThan(oneHourAgo) as any },
    });

    if (recentCount >= MAX_ATTEMPTS_PER_HOUR) {
      throw new HttpException(
        'Too many OTP requests. Please try again after 1 hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.otpRepository.update(
      { phoneNumber, isUsed: false },
      { isUsed: true },
    );

    const otpCode = Array.from({ length: OTP_DIGITS }, () =>
      Math.floor(Math.random() * 10),
    ).join('');

    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpCode, salt);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({ phoneNumber, otpHash, expiresAt }),
    );

    const message = `Your Baldia Mart verification code is: ${otpCode}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
    await this.smsService.sendSms(formattedPhone, message);

    this.logger.log(
      `OTP generated for ${formattedPhone} → ${otpCode} (expires in ${OTP_EXPIRY_MINUTES} min)`,
    );

    return { message: `OTP sent to ${phoneNumber}` };
  }

  async verifyOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const now = new Date();
    this.logger.debug(`Verifying OTP for ${phoneNumber} with code ${otpCode}`);

    const otpRecord = await this.otpRepository.findOne({
      where: { phoneNumber, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      this.logger.warn(`No active OTP found for ${phoneNumber}`);
      throw new BadRequestException('No active OTP found. Please request a new one.');
    }

    if (otpRecord.expiresAt < now) {
      this.logger.warn(`OTP expired for ${phoneNumber}. Expired at: ${otpRecord.expiresAt}, Now: ${now}`);
      otpRecord.isUsed = true;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    otpRecord.attempts += 1;

    if (otpRecord.attempts > 3) {
      this.logger.warn(`Too many attempts for ${phoneNumber}`);
      otpRecord.isUsed = true;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(otpCode, otpRecord.otpHash);
    this.logger.debug(`Bcrypt comparison for ${phoneNumber}: ${isValid}`);

    if (!isValid) {
      await this.otpRepository.save(otpRecord);
      const remaining = 3 - otpRecord.attempts;
      throw new BadRequestException(
        `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      );
    }

    otpRecord.isUsed = true;
    await this.otpRepository.save(otpRecord);

    this.logger.log(`OTP verified successfully for ${phoneNumber}`);
    return true;
  }
}
