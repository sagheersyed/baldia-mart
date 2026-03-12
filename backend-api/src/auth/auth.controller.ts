import { Controller, Post, Get, Body, UnauthorizedException, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('firebase-auth'))
  async login(@Req() req: Request) {
    // The firebase strategy will attach the decoded token to req.user
    const firebaseUser = req.user;
    if (!firebaseUser) throw new UnauthorizedException();
    
    // Validate or create user in DB
    const user = await this.authService.validateFirebaseUser(firebaseUser);
    
  // Return JWT customized for our own backend security
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: Request) {
    return req.user;
  }
}
