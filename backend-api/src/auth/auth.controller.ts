import { Controller, Post, Get, Body, UnauthorizedException, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OtpService } from '../otp/otp.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('login')
  @UseGuards(AuthGuard('firebase-auth'))
  async login(@Req() req: Request) {
    const firebaseUser = req.user;
    if (!firebaseUser) throw new UnauthorizedException();
    const user = await this.authService.validateFirebaseUser(firebaseUser);
    return this.authService.login(user);
  }

  @Post('send-otp')
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async sendOtp(@Body('phoneNumber') phoneNumber: string) {
    return this.otpService.sendOtp(phoneNumber);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body('phoneNumber') phoneNumber: string,
    @Body('otpCode') otpCode: string,
  ) {
    const isValid = await this.otpService.verifyOtp(phoneNumber, otpCode);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const { user, isNew } = await this.authService.findOrCreateByPhone(phoneNumber);
    const authResponse = await this.authService.loginWithPhone(user);
    
    return {
      ...authResponse,
      isNewUser: isNew,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: Request) {
    return req.user;
  }
}
