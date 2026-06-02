import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicineSubstitution } from './medicine-substitution.entity';
import { MedicinesService } from '../medicines/medicines.service';

@Injectable()
export class SubstitutionsService {
  constructor(
    @InjectRepository(MedicineSubstitution)
    private readonly subRepo: Repository<MedicineSubstitution>,
    private readonly medicinesService: MedicinesService,
  ) {}

  /**
   * Get approved substitutes for a medicine, ordered by priority.
   * Includes both manual mappings and generic alternatives.
   */
  async getSubstitutes(medicineId: string) {
    // 1. Get manual mappings
    const manualSubs = await this.subRepo.find({
      where: { originalMedicineId: medicineId, isActive: true },
      relations: ['substituteMedicine'],
      order: { priority: 'DESC' },
    });

    const manualIds = manualSubs.map(s => s.substituteMedicineId);

    // 2. Get generic alternatives if the medicine has a generic name
    const original = await this.medicinesService.findById(medicineId);
    let genericSubs: any[] = [];
    
    if (original.genericName) {
      const alternatives = await this.medicinesService.findByGenericName(original.genericName, medicineId);
      // Filter out those already in manual mapping to avoid duplicates
      genericSubs = alternatives.filter(a => !manualIds.includes(a.id)).map(a => ({
        id: `gen-${a.id}`,
        substituteMedicineId: a.id,
        substituteMedicine: a,
        substitutionReason: `Same generic: ${original.genericName}`,
        priority: 0,
      }));
    }

    return [...manualSubs, ...genericSubs];
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
