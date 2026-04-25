import { IsBoolean, IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class VendorProductDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stockQty: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

