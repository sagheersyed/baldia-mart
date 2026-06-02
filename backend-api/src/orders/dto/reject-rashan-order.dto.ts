import { IsString, IsNotEmpty } from 'class-validator';

export class RejectRashanOrderDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
