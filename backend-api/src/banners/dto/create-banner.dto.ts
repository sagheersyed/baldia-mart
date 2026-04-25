import { IsBoolean, IsHexColor, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBannerDto {
  @IsOptional()
  @IsIn(['mart', 'food', 'all'])
  section?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  backgroundImageUrl?: string;

  @IsOptional()
  @IsIn(['image', 'text', 'hybrid'])
  bannerType?: string;

  @IsOptional()
  @IsString()
  tagLabel?: string;

  @IsOptional()
  @IsIn(['product', 'brand', 'restaurant', 'category', 'none'])
  linkType?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  zoneId?: string;
}

