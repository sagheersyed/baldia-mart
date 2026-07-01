import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsBoolean, Min } from 'class-validator';

export class CreateCommissionConfigDto {
  @IsEnum(['vendor', 'restaurant', 'pharmacy', 'platform_default'])
  entityType: string;

  @IsOptional()
  @IsEnum(['food', 'mart', 'rashan', 'pharma', 'all'])
  moduleType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsNumber()
  @Min(0)
  commissionPercent: number;

  @IsOptional()
  @IsNumber()
  minCommission?: number;

  @IsOptional()
  @IsNumber()
  maxCommission?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  effectiveFrom: string; // ISO Date

  @IsOptional()
  @IsString()
  effectiveTo?: string; // ISO Date
}

export class ManualAdjustmentDto {
  @IsUUID()
  walletId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CREDIT', 'DEBIT'])
  direction: 'CREDIT' | 'DEBIT';

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsEnum(['EARNINGS', 'CASH_IN_HAND', 'PLATFORM_REV', 'TAX_PAYABLE', 'VOUCHER_EXP'])
  accountTag?: string;
}

export class ReconcileCashDto {
  @IsUUID()
  riderId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  referenceId: string;
}
