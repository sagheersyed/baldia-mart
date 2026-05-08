import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartRepository: Repository<CartItem>,
    private productsService: ProductsService,
  ) {}

  async getCartByUserId(userId: string): Promise<CartItem[]> {
    return this.cartRepository.find({
      where: { userId },
      relations: ['product'],
    });
  }

  async addItem(userId: string, productId: string, quantity: number = 1): Promise<CartItem> {
    const product = await this.productsService.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    await this.cartRepository
      .createQueryBuilder()
      .insert()
      .into(CartItem)
      .values({ userId, productId, quantity })
      .onConflict(`("user_id", "product_id") DO UPDATE SET "quantity" = "cart_items"."quantity" + EXCLUDED.quantity`)
      .execute();

    return this.cartRepository.findOneOrFail({ 
      where: { userId, productId },
      relations: ['product']
    });
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<CartItem> {
    const cartItem = await this.cartRepository.findOne({ where: { id: itemId, userId } });
    if (!cartItem) throw new NotFoundException('Cart item not found');
    
    cartItem.quantity = quantity;
    return this.cartRepository.save(cartItem);
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    await this.cartRepository.delete({ id: itemId, userId });
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }
}
