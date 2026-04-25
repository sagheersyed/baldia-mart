import { IsString, IsNotEmpty } from 'class-validator';

export class RejectWithdrawalDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
}
