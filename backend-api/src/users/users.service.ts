import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private cacheService: CacheService,
  ) {}

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { firebaseUid } });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phoneNumber } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached === 'NOT_FOUND') throw new NotFoundException('User not found');
    if (cached) return cached;

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      await this.cacheService.set(cacheKey, 'NOT_FOUND', 300);
      throw new NotFoundException('User not found');
    }
    
    await this.cacheService.set(cacheKey, user, 3600);
    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }
}
