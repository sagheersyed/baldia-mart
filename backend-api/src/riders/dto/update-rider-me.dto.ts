import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRiderMeDto {
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
  @IsString()
  cnicFrontUrl?: string;

  @IsOptional()
  @IsString()
  cnicBackUrl?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;

  @IsOptional()
  @IsBoolean()
  isProfileComplete?: boolean;
}

