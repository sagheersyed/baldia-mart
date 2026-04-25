import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDeliveryZoneDto {
  @IsString()
  name: string;

  @IsNumber()
  centerLat: number;

  @IsNumber()
  centerLng: number;

  @IsNumber()
  @Min(0.1)
  @Max(500)
  radiusKm: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

