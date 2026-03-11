import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCart(@Req() req: Request) {
    const user = req.user as any;
    return this.cartService.getCartByUserId(user.id);
  }

  @Post('add')
  @UseGuards(AuthGuard('jwt'))
  async addItem(@Req() req: Request, @Body() body: { productId: string; quantity: number }) {
    const user = req.user as any;
    return this.cartService.addItem(user.id, body.productId, body.quantity);
  }

  @Put('update/:itemId')
  @UseGuards(AuthGuard('jwt'))
  async updateItem(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number }
  ) {
    const user = req.user as any;
    return this.cartService.updateItemQuantity(user.id, itemId, body.quantity);
  }

  @Delete('remove/:itemId')
  @UseGuards(AuthGuard('jwt'))
  async removeItem(@Req() req: Request, @Param('itemId') itemId: string) {
    const user = req.user as any;
    return this.cartService.removeItem(user.id, itemId);
  }
}
