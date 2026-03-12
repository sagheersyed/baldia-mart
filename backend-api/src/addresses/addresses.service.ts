import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async findAllByUser(userId: string): Promise<Address[]> {
    return this.addressRepository.find({ where: { userId }, order: { isDefault: 'DESC' } });
  }

  async create(userId: string, data: Partial<Address>): Promise<Address> {
    const address = this.addressRepository.create({ ...data, userId });
    return this.addressRepository.save(address);
  }

  async findOne(id: string): Promise<Address> {
    const address = await this.addressRepository.findOne({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const address = await this.findOne(id);
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    await this.addressRepository.delete(id);
    return { message: 'Address deleted' };
  }

  async setDefault(id: string, userId: string): Promise<Address> {
    // Unset all defaults for this user
    await this.addressRepository.update({ userId }, { isDefault: false });
    // Set chosen one as default
    const address = await this.findOne(id);
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  async update(id: string, userId: string, data: Partial<Address>): Promise<Address> {
    const address = await this.findOne(id);
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    
    // If setting to default, unset others first
    if (data.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    
    Object.assign(address, data);
    return this.addressRepository.save(address);
  }
}
