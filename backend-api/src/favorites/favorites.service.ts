import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
  ) {}

  async getFavoritesByUserId(userId: string): Promise<Favorite[]> {
    return this.favoritesRepository.find({
      where: { userId },
      relations: ['product', 'restaurant', 'product.category', 'product.brand'],
    });
  }

  async toggleFavorite(userId: string, type: 'product' | 'restaurant', targetId: string): Promise<any> {
    const where: any = { userId };
    if (type === 'product') where.productId = targetId;
    else where.restaurantId = targetId;

    const existing = await this.favoritesRepository.findOne({ where });

    if (existing) {
      await this.favoritesRepository.remove(existing);
      return { status: 'removed' };
    } else {
      const favorite = this.favoritesRepository.create({
        userId,
        type,
        productId: type === 'product' ? targetId : undefined,
        restaurantId: type === 'restaurant' ? targetId : undefined,
      });
      await this.favoritesRepository.save(favorite);
      return { status: 'added' };
    }
  }

  // Bulk sync for migration from local storage
  async syncFavorites(userId: string, items: { type: 'product' | 'restaurant', targetId: string }[]): Promise<void> {
    await this.favoritesRepository.manager.transaction(async (manager) => {
      for (const item of items) {
        const where: any = { userId };
        if (item.type === 'product') where.productId = item.targetId;
        else where.restaurantId = item.targetId;

        const existing = await manager.findOne(Favorite, { where });
        if (!existing) {
          const favorite = manager.create(Favorite, {
            userId,
            type: item.type,
            productId: item.type === 'product' ? item.targetId : undefined,
            restaurantId: item.type === 'restaurant' ? item.targetId : undefined,
          });
          await manager.save(Favorite, favorite).catch(e => {
              // Ignore unique constraint violations during bulk sync
              if (e.code !== '23505') {
                 console.warn('Failed to sync favorite item', item, e.message);
              }
          });
        }
      }
    });
  }
}
