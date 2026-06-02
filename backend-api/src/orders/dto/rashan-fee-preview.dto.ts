import { IsString, IsNumber, IsIn, Min } from 'class-validator';

export class RashanFeePreviewDto {
  @IsString()
  @IsIn(['light', 'medium', 'heavy'])
  weightTier: string;

  @IsNumber()
  @Min(0)
  floor: number;

  @IsString()
  @IsIn(['gate', 'doorstep', 'inside'])
  placement: string;
}
