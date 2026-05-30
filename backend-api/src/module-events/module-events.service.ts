import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ModuleEvent } from './module-event.entity';
import { OrdersGateway } from '../orders/orders.gateway';

@Injectable()
export class ModuleEventsService {
  constructor(
    @InjectRepository(ModuleEvent)
    private readonly moduleEventRepository: Repository<ModuleEvent>,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async findAll(section?: string, adminMode = false): Promise<ModuleEvent[]> {
    const query = this.moduleEventRepository.createQueryBuilder('event');

    if (!adminMode) {
      const now = new Date();
      query.where('event.isActive = :isActive', { isActive: true })
        .andWhere('(event.startDate IS NULL OR event.startDate <= :now)', { now })
        .andWhere('(event.endDate IS NULL OR event.endDate >= :now)', { now });
    }

    query.orderBy('event.sortOrder', 'ASC')
      .addOrderBy('event.createdAt', 'DESC');

    if (section) {
      if (adminMode) {
        query.where('event.section = :section', { section: section.toLowerCase() });
      } else {
        query.andWhere('event.section = :section', { section: section.toLowerCase() });
      }
    }

    const events = await query.getMany();

    const populatedEvents = await Promise.all(events.map(async (event) => {
      const itemIds = event.itemIds || [];
      if (itemIds.length === 0) {
        return { ...event, items: [] };
      }
      const ids = itemIds.slice(0, 8); // get first 8 items for preview
      let items: any[] = [];
      try {
        if (event.section === 'pharma') {
          const medRepo = this.moduleEventRepository.manager.getRepository('Medicine');
          items = await medRepo.find({
            where: { id: In(ids), isActive: true },
            relations: ['brand'],
          });
        } else if (event.section === 'food') {
          const menuRepo = this.moduleEventRepository.manager.getRepository('MenuItem');
          items = await menuRepo.find({
            where: { id: In(ids), isAvailable: true },
            relations: ['restaurant'],
          });
        } else {
          const prodRepo = this.moduleEventRepository.manager.getRepository('Product');
          items = await prodRepo.find({
            where: { id: In(ids), isActive: true },
            relations: ['brand'],
          });
        }
      } catch (err) {
        console.error(`Failed to load items for event ${event.id}:`, err);
      }
      return { ...event, items };
    }));

    return populatedEvents as any;
  }

  async findOne(id: string): Promise<ModuleEvent> {
    const event = await this.moduleEventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Module Event not found');
    
    const itemIds = event.itemIds || [];
    let items: any[] = [];
    if (itemIds.length > 0) {
      try {
        if (event.section === 'pharma') {
          const medRepo = this.moduleEventRepository.manager.getRepository('Medicine');
          items = await medRepo.find({
            where: { id: In(itemIds), isActive: true },
            relations: ['brand'],
          });
        } else if (event.section === 'food') {
          const menuRepo = this.moduleEventRepository.manager.getRepository('MenuItem');
          items = await menuRepo.find({
            where: { id: In(itemIds), isAvailable: true },
            relations: ['restaurant'],
          });
        } else {
          const prodRepo = this.moduleEventRepository.manager.getRepository('Product');
          items = await prodRepo.find({
            where: { id: In(itemIds), isActive: true },
            relations: ['brand'],
          });
        }
      } catch (err) {
        console.error(`Failed to load items for event ${id}:`, err);
      }
    }

    return { ...event, items } as any;
  }

  async create(data: Partial<ModuleEvent>): Promise<ModuleEvent> {
    const event = this.moduleEventRepository.create(data);
    const saved = await this.moduleEventRepository.save(event);
    this.ordersGateway.emitPharmaUpdated(); // notify mobile apps to refresh
    return saved;
  }

  async update(id: string, data: Partial<ModuleEvent>): Promise<ModuleEvent> {
    const event = await this.findOne(id);
    Object.assign(event, data);
    const saved = await this.moduleEventRepository.save(event);
    this.ordersGateway.emitPharmaUpdated(); // notify mobile apps to refresh
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.moduleEventRepository.delete(id);
    this.ordersGateway.emitPharmaUpdated(); // notify mobile apps to refresh
  }
}
