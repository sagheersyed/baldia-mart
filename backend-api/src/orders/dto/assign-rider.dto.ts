import { IsUUID } from 'class-validator';

export class AssignRiderDto {
  @IsUUID()
  riderId: string;
}
