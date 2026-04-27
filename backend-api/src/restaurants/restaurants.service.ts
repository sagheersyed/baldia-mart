import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      relations: ['menuItems'],
    });
  }

  /**
   * Lightweight server-side search for the mobile global search screen.
   * Matches restaurant name, cuisine type, and description (case-insensitive).
   */
  async search(query: string, page = 1, limit = 20): Promise<{ data: Restaurant[]; total: number; page: number; limit: number }> {
    const q = (query || '').trim();
    const take = Math.max(1, Math.min(50, limit));
    const skip = Math.max(0, (page - 1) * take);

    if (!q) {
      const [data, total] = await this.restaurantRepository.findAndCount({
        where: { isActive: true },
        order: { rating: 'DESC', name: 'ASC' },
        take,
        skip,
      });
      return { data, total, page, limit: take };
    }

    const wildcard = `%${q}%`;
    const [data, total] = await this.restaurantRepository.findAndCount({
      where: [
        { isActive: true, name: ILike(wildcard) },
        { isActive: true, cuisineType: ILike(wildcard) },
        { isActive: true, description: ILike(wildcard) },
      ],
      order: { rating: 'DESC', name: 'ASC' },
      take,
      skip,
    });
    return { data, total, page, limit: take };
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['menuItems'],
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async create(data: Partial<Restaurant>): Promise<Restaurant> {
    const restaurant = this.restaurantRepository.create(data);
    return this.restaurantRepository.save(restaurant);
  }

  async update(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    const restaurant = await this.findOne(id);
    Object.assign(restaurant, data);
    return this.restaurantRepository.save(restaurant);
  }

  async remove(id: string): Promise<void> {
    const restaurant = await this.findOne(id);
    restaurant.isActive = false;
    await this.restaurantRepository.save(restaurant);
  }
}
