import { Controller, Post, Get, Body, UnauthorizedException, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OtpService } from '../otp/otp.service';
import { Throttle } from '@nestjs/throttler';
import { SettingsService } from '../settings/settings.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('config')
  async getConfig() {
    const pub = await this.settingsService.getPublic();
    return {
      auth_customer_mpin_enabled: pub.auth_customer_mpin_enabled,
      auth_customer_otp_enabled: pub.auth_customer_otp_enabled,
      auth_customer_google_enabled: pub.auth_customer_google_enabled,
      auth_rider_mpin_enabled: pub.auth_rider_mpin_enabled,
      auth_rider_otp_enabled: pub.auth_rider_otp_enabled,
    };
  }

  @Post('login')
  @UseGuards(AuthGuard('firebase-auth'))
  async login(@Req() req: Request) {
    const firebaseUser = req.user;
    if (!firebaseUser) throw new UnauthorizedException();
    const { user, isNew } = await this.authService.validateFirebaseUser(firebaseUser);
    const authResponse = this.authService.login(user);
    return {
      ...authResponse,
      isNewUser: isNew
    };
  }

  @Post('admin/login')
  async adminLogin(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password) throw new UnauthorizedException('Missing credentials');
    return this.authService.adminLogin(email, password);
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

  // --- MPIN CUSTOMER ---
  @Post('setup-mpin')
  @UseGuards(AuthGuard('jwt'))
  async setupCustomerMpin(@Req() req: any, @Body('mpin') mpin: string) {
    if (!mpin || mpin.length !== 4) throw new BadRequestException('MPIN must be 4 digits');
    if (req.user.role !== 'customer') throw new UnauthorizedException('Customers only');
    return this.authService.setupMpin(req.user.id, mpin, 'customer');
  }

  @Post('login-mpin')
  async loginCustomerMpin(@Body('phoneNumber') phoneNumber: string, @Body('mpin') mpin: string) {
    if (!phoneNumber || !mpin) throw new BadRequestException('Missing credentials');
    return this.authService.loginWithMpin(phoneNumber, mpin, 'customer');
  }

  @Post('check-status')
  async checkStatus(@Body('phoneNumber') phoneNumber: string, @Body('role') role: string) {
    if (!phoneNumber) throw new BadRequestException('Phone number required');
    return this.authService.checkStatus(phoneNumber, role || 'customer');
  }

  @Post('register-mpin')
  async registerCustomerMpin(@Body('phoneNumber') phoneNumber: string, @Body('mpin') mpin: string) {
    if (!phoneNumber || !mpin || mpin.length !== 4) throw new BadRequestException('Invalid payload');
    return this.authService.registerWithMpin(phoneNumber, mpin, 'customer');
  }

  // --- RIDER OTP LOGIN ---

  @Post('rider/send-otp')
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async sendRiderOtp(@Body('phoneNumber') phoneNumber: string) {
    return this.otpService.sendOtp(phoneNumber);
  }

  @Post('rider/verify-otp')
  async verifyRiderOtp(
    @Body('phoneNumber') phoneNumber: string,
    @Body('otpCode') otpCode: string,
  ) {
    const isValid = await this.otpService.verifyOtp(phoneNumber, otpCode);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const { rider, isNew } = await this.authService.findOrCreateRiderByPhone(phoneNumber);
    const authResponse = await this.authService.loginRider(rider);
    
    return {
      ...authResponse,
      isNewUser: isNew,
    };
  }

  // --- MPIN RIDER ---
  @Post('rider/setup-mpin')
  @UseGuards(AuthGuard('jwt'))
  async setupRiderMpin(@Req() req: any, @Body('mpin') mpin: string) {
    if (!mpin || mpin.length !== 4) throw new BadRequestException('MPIN must be 4 digits');
    if (req.user.role !== 'rider') throw new UnauthorizedException('Riders only');
    return this.authService.setupMpin(req.user.id, mpin, 'rider');
  }

  @Post('rider/login-mpin')
  async loginRiderMpin(@Body('phoneNumber') phoneNumber: string, @Body('mpin') mpin: string) {
    if (!phoneNumber || !mpin) throw new BadRequestException('Missing credentials');
    return this.authService.loginWithMpin(phoneNumber, mpin, 'rider');
  }

  @Post('rider/register-mpin')
  async registerRiderMpin(@Body('phoneNumber') phoneNumber: string, @Body('mpin') mpin: string) {
    if (!phoneNumber || !mpin || mpin.length !== 4) throw new BadRequestException('Invalid payload');
    return this.authService.registerWithMpin(phoneNumber, mpin, 'rider');
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: Request) {
    return req.user;
  }
}
