import { 
  Controller, Get, Post, Body, Param, Put, UseGuards, Query 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';
import { PharmacyInventoryService } from './pharmacy-inventory.service';
import { Pharmacy } from './pharmacy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('pharma/b2b')
@UseGuards(JwtAuthGuard)
export class PharmacyB2BController {
  constructor(
    private readonly inventoryService: PharmacyInventoryService,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
  ) {}

  private async getMyPharmacy(userId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { vendorId: userId } });
    if (!pharmacy) throw new Error('Pharmacy not found for this user');
    return pharmacy;
  }

  @Get('inventory')
  async getInventory(@GetUser('id') userId: string) {
    const pharmacy = await this.getMyPharmacy(userId);
    return this.inventoryService.getInventory(pharmacy.id);
  }

  @Put('inventory/stock')
  async updateStock(@GetUser('id') userId: string, @Body() dto: { medicineId: string; quantity: number }) {
    const pharmacy = await this.getMyPharmacy(userId);
    return this.inventoryService.updateStock(pharmacy.id, dto.medicineId, dto.quantity);
  }

  @Post('inventory/bulk')
  async bulkUpdate(@GetUser('id') userId: string, @Body() dto: { updates: any[] }) {
    const pharmacy = await this.getMyPharmacy(userId);
    return this.inventoryService.bulkUpdate(pharmacy.id, dto.updates);
  }
}
