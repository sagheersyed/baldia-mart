import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './menu-item.entity';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
  ) {}

  async findByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    return this.menuItemRepository.find({
      where: { restaurantId, isAvailable: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findAll(): Promise<MenuItem[]> {
    return this.menuItemRepository.find({ 
      relations: ['restaurant'],
      order: { name: 'ASC' } 
    });
  }

  async findOne(id: string): Promise<MenuItem> {
    const item = await this.menuItemRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async create(data: Partial<MenuItem>): Promise<MenuItem> {
    const item = this.menuItemRepository.create(data);
    return this.menuItemRepository.save(item);
  }

  async update(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    const item = await this.findOne(id);
    Object.assign(item, data);
    return this.menuItemRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.menuItemRepository.remove(item);
  }
}
