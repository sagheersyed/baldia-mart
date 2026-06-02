import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyMedicine } from './pharmacy-medicine.entity';
import { Pharmacy } from './pharmacy.entity';

@Injectable()
export class PharmacyInventoryService {
  constructor(
    @InjectRepository(PharmacyMedicine)
    private readonly pMedRepo: Repository<PharmacyMedicine>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
  ) {}

  async getInventory(pharmacyId: string) {
    return this.pMedRepo.find({
      where: { pharmacyId, isActive: true },
      relations: ['medicine', 'medicine.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStock(pharmacyId: string, medicineId: string, quantity: number) {
    let pMed = await this.pMedRepo.findOne({ where: { pharmacyId, medicineId } });
    
    if (!pMed) {
      pMed = this.pMedRepo.create({
        pharmacyId,
        medicineId,
        stockQuantity: quantity,
      });
    } else {
      pMed.stockQuantity = quantity;
    }

    return this.pMedRepo.save(pMed);
  }

  async bulkUpdate(pharmacyId: string, updates: { medicineId: string; quantity: number }[]) {
    for (const update of updates) {
      await this.updateStock(pharmacyId, update.medicineId, update.quantity);
    }
  }

  async toggleActive(id: string, pharmacyId: string) {
    const pMed = await this.pMedRepo.findOne({ where: { id, pharmacyId } });
    if (!pMed) throw new NotFoundException('Inventory item not found');
    pMed.isActive = !pMed.isActive;
    return this.pMedRepo.save(pMed);
  }
}
