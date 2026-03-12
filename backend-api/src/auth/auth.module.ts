import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { FirebaseStrategy } from './firebase.strategy';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
    OtpModule,
  ],
  providers: [AuthService, JwtStrategy, FirebaseStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
