import { IsString, IsNumber, IsIn, Min } from 'class-validator';

export class RashanFeePreviewDto {
  @IsString()
  @IsIn(['Tier 1 (0-50kg)', 'Tier 2 (51-100kg)', 'Tier 3 (101-200kg)', 'Tier 4 (201kg+)'])
  weightTier: string;

  @IsNumber()
  @Min(0)
  floor: number;

  @IsString()
  @IsIn(['Ground', 'First', 'Second', 'Third', 'Fourth+'])
  placement: string;
}
