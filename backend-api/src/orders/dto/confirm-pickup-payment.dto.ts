import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class ConfirmPickupPaymentDto {
  @IsOptional()
  @IsUUID()
  subOrderId?: string;

  @IsNumber()
  @Min(0)
  amountPaid: number;
}
