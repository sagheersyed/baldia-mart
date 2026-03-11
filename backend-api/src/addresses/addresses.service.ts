import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.addressRepository.find({ where: { userId } });
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
}
