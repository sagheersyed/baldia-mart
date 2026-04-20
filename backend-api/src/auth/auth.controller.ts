import { Controller, Post, Get, Body, UnauthorizedException, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OtpService } from '../otp/otp.service';
import { Throttle } from '@nestjs/throttler';
import { SettingsService } from '../settings/settings.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SendOtpDto, VerifyOtpDto, MpinDto, LoginMpinDto, CheckStatusDto, AdminLoginDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get Auth Configurations' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Login via Firebase Auth Token' })
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
  @ApiOperation({ summary: 'Admin Portal Login' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Post('send-otp')
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @ApiOperation({ summary: 'Send OTP SMS to Customer' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phoneNumber);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify Customer OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const isValid = await this.otpService.verifyOtp(dto.phoneNumber, dto.otpCode);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const { user, isNew } = await this.authService.findOrCreateByPhone(dto.phoneNumber);
    const authResponse = await this.authService.loginWithPhone(user);
    
    return {
      ...authResponse,
      isNewUser: isNew,
    };
  }

  // --- MPIN CUSTOMER ---
  @Post('setup-mpin')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup Customer MPIN' })
  async setupCustomerMpin(@Req() req: any, @Body() dto: MpinDto) {
    if (req.user.role !== 'customer') throw new UnauthorizedException('Customers only');
    return this.authService.setupMpin(req.user.id, dto.mpin, 'customer');
  }

  @Post('login-mpin')
  @ApiOperation({ summary: 'Customer MPIN Login' })
  async loginCustomerMpin(@Body() dto: LoginMpinDto) {
    return this.authService.loginWithMpin(dto.phoneNumber, dto.mpin, 'customer');
  }

  @Post('check-status')
  @ApiOperation({ summary: 'Check User/Rider Registration Status' })
  async checkStatus(@Body() dto: CheckStatusDto) {
    return this.authService.checkStatus(dto.phoneNumber, dto.role || 'customer');
  }

  @Post('register-mpin')
  @ApiOperation({ summary: 'Direct Customer Registration via MPIN' })
  async registerCustomerMpin(@Body() dto: LoginMpinDto) {
    return this.authService.registerWithMpin(dto.phoneNumber, dto.mpin, 'customer');
  }

  // --- RIDER OTP LOGIN ---

  @Post('rider/send-otp')
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @ApiOperation({ summary: 'Send OTP SMS to Rider' })
  async sendRiderOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phoneNumber);
  }

  @Post('rider/verify-otp')
  @ApiOperation({ summary: 'Verify Rider OTP' })
  async verifyRiderOtp(@Body() dto: VerifyOtpDto) {
    const isValid = await this.otpService.verifyOtp(dto.phoneNumber, dto.otpCode);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const { rider, isNew } = await this.authService.findOrCreateRiderByPhone(dto.phoneNumber);
    const authResponse = await this.authService.loginRider(rider);
    
    return {
      ...authResponse,
      isNewUser: isNew,
    };
  }

  // --- MPIN RIDER ---
  @Post('rider/setup-mpin')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup Rider MPIN' })
  async setupRiderMpin(@Req() req: any, @Body() dto: MpinDto) {
    if (req.user.role !== 'rider') throw new UnauthorizedException('Riders only');
    return this.authService.setupMpin(req.user.id, dto.mpin, 'rider');
  }

  @Post('rider/login-mpin')
  @ApiOperation({ summary: 'Rider MPIN Login' })
  async loginRiderMpin(@Body() dto: LoginMpinDto) {
    return this.authService.loginWithMpin(dto.phoneNumber, dto.mpin, 'rider');
  }

  @Post('rider/register-mpin')
  @ApiOperation({ summary: 'Direct Rider Registration via MPIN' })
  async registerRiderMpin(@Body() dto: LoginMpinDto) {
    return this.authService.registerWithMpin(dto.phoneNumber, dto.mpin, 'rider');
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Current Logged in User Profile' })
  async getMe(@Req() req: Request) {
    return req.user;
  }
}
