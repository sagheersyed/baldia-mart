import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service';
import { Request } from 'express';

@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(@Req() req: Request) {
    const user = req.user as any;
    const favs = await this.favoritesService.getFavoritesByUserId(user.id);
    
    // Transform to mobile-friendly format
    return favs.map(f => {
      const item = f.type === 'product' ? f.product : f.restaurant;
      if (!item) return null;
      return {
        ...item,
        type: f.type,
        targetId: f.type === 'product' ? f.productId : f.restaurantId,
      };
    }).filter(Boolean);
  }

  @Post('toggle')
  async toggleFavorite(
    @Req() req: Request,
    @Body() body: { type: 'product' | 'restaurant', targetId: string }
  ) {
    const user = req.user as any;
    return this.favoritesService.toggleFavorite(user.id, body.type, body.targetId);
  }

  @Post('sync')
  async syncFavorites(
    @Req() req: Request,
    @Body() body: { items: { type: 'product' | 'restaurant', targetId: string }[] }
  ) {
    const user = req.user as any;
    return this.favoritesService.syncFavorites(user.id, body.items);
  }
}
