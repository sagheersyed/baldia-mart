import { IsString, IsOptional } from 'class-validator';

export class ApproveWithdrawalDto {
  @IsString()
  referenceId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
