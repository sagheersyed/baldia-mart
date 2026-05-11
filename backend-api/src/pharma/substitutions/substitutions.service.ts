import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicineSubstitution } from './medicine-substitution.entity';

@Injectable()
export class SubstitutionsService {
  constructor(
    @InjectRepository(MedicineSubstitution)
    private readonly subRepo: Repository<MedicineSubstitution>,
  ) {}

  /**
   * Get approved substitutes for a medicine, ordered by priority.
   */
  async getSubstitutes(medicineId: string) {
    return this.subRepo.find({
      where: { originalMedicineId: medicineId, isActive: true },
      relations: ['substituteMedicine'],
      order: { priority: 'DESC' },
    });
  }

  async create(dto: {
    originalMedicineId: string;
    substituteMedicineId: string;
    approvedBy: string;
    substitutionReason?: string;
    priority?: number;
  }) {
    const sub = this.subRepo.create({
      ...dto,
      isActive: true,
    });
    return this.subRepo.save(sub);
  }

  async deactivate(id: string) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Substitution not found');
    sub.isActive = false;
    return this.subRepo.save(sub);
  }
}
