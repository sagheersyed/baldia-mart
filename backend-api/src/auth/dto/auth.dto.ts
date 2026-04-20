import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+923412248616' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+923412248616' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otpCode: string;
}

export class MpinDto {
  @ApiProperty({ example: '1234', minLength: 4, maxLength: 4 })
  @IsString()
  @Length(4, 4)
  mpin: string;
}

export class LoginMpinDto {
  @ApiProperty({ example: '+923412248616' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 4)
  mpin: string;
}

export class CheckStatusDto {
  @ApiProperty({ example: '+923412248616' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'customer', enum: ['customer', 'rider'] })
  @IsString()
  @IsOptional()
  role?: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@baldia.mart' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin_pass_123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
