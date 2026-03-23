import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class PlaceOrderDto {
  @IsUUID()
  addressId: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  orderType?: string; // mart, food

  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items?: CheckoutItemDto[];
}
