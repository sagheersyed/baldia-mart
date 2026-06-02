import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateBusinessReviewDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsUUID()
  subOrderId?: string;

  @IsUUID()
  businessId: string;

  @IsIn(['restaurant', 'brand'])
  businessType: 'restaurant' | 'brand';

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

