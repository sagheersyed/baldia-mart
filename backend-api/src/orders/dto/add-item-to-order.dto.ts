import { IsUUID, IsNumber, Min } from 'class-validator';

export class AddItemToOrderDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
