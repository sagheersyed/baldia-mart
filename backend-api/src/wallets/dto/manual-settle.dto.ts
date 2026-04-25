import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ManualSettleDto {
  @IsUUID()
  walletId: string;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsString()
  referenceId: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
