import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './banner.entity';
import { BannersGateway } from './banners.gateway';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
    private bannersGateway: BannersGateway,
  ) {}

  async findAll(section?: string, zoneId?: string): Promise<Banner[]> {
    const query = this.bannerRepository.createQueryBuilder('banner')
      .where('banner.isActive = :isActive', { isActive: true })
      .orderBy('banner.sortOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'DESC');

    if (section && section !== 'all') {
      // STRICT: Only show matches for the requested section OR universal 'all' banners
      query.andWhere('(banner.section = :section OR banner.section = :all)', { 
        section: section.toLowerCase(), 
        all: 'all' 
      });
    } else if (section === 'all') {
      // Only returns global banners
      query.andWhere('banner.section = :all', { all: 'all' });
    }

    if (zoneId) {
      // Only show banners for this zone OR banners with no zone (global)
      query.andWhere('(banner.zoneId = :zoneId OR banner.zoneId IS NULL)', { zoneId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(data: Partial<Banner>): Promise<Banner> {
    const banner = this.bannerRepository.create(data);
    const saved = await this.bannerRepository.save(banner);
    this.bannersGateway.emitBannersUpdated();
    return saved;
  }

  async update(id: string, data: Partial<Banner>): Promise<Banner> {
    const banner = await this.findOne(id);
    Object.assign(banner, data);
    const saved = await this.bannerRepository.save(banner);
    this.bannersGateway.emitBannersUpdated();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.bannerRepository.delete(id);
    this.bannersGateway.emitBannersUpdated();
  }
}
