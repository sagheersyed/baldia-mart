import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class UpdateRiderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPharmaApproved?: boolean;
}
