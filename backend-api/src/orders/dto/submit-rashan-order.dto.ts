import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitRashanOrderDto {
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @IsString()
  bulkListText?: string;

  @IsOptional()
  @IsString()
  bulkListPhotoUrl?: string;

  @IsString()
  bulkMobileNumber: string;

  @IsString()
  bulkStreetAddress: string;

  @IsString()
  bulkCity: string;

  @IsOptional()
  @IsString()
  bulkLandmark?: string;

  @IsNumber()
  bulkFloor: number;

  @IsIn(['gate', 'doorstep', 'inside'])
  bulkPlacement: 'gate' | 'doorstep' | 'inside';

  @IsIn(['light', 'medium', 'heavy'])
  bulkWeightTier: 'light' | 'medium' | 'heavy';

  @IsOptional()
  @IsString()
  bulkAdditionalNotes?: string;
}

