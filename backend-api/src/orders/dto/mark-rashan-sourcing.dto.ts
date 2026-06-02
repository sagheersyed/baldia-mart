import { IsOptional, IsUUID } from 'class-validator';

export class MarkRashanSourcingDto {
  @IsOptional()
  @IsUUID()
  riderId?: string;
}
