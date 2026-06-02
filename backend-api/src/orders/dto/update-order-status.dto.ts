import { IsString, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'], {
    message: 'status must be one of: pending, confirmed, preparing, out_for_delivery, delivered, cancelled',
  })
  status: string;
}

