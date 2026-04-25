import { IsString, IsNumber, IsOptional, IsUUID, IsIn, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @IsIn(['jazzcash', 'easypaisa'])
  provider: string;

  @IsNumber()
  @Min(1)
  amount: number;

  /** Optional: user's mobile wallet number for OTC/MA flows */
  @IsOptional()
  @IsString()
  mobileNumber?: string;
}
