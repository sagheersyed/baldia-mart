import { IsNumber, IsOptional, Min } from 'class-validator';

export class SetRashanQuotationDto {
  @IsNumber()
  @Min(0)
  productTotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFeeOverride?: number;
}
