import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { Otp } from './otp.entity';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Otp])],
  providers: [OtpService, SmsService],
  exports: [OtpService, SmsService],
})
export class OtpModule {}
