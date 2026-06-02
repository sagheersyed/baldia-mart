import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWithdrawalRequestDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}

