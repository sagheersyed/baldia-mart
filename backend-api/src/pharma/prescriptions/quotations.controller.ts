import { Controller, Get, Post, Param, Body, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ControlledSubstanceInterceptor } from '../compliance/controlled-substance.interceptor';

@Controller('pharma/quotations')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ControlledSubstanceInterceptor)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  generate(
    @Body() dto: { 
      prescriptionId: string; 
      items: { 
        id?: string;
        medicineId?: string; 
        quantity: number; 
        isSubstituted?: boolean; 
        originalMedicineId?: string;
        isManual?: boolean;
        name?: string;
        mrp?: number;
        brand?: string;
        strength?: string;
      }[]; 
      deliveryCharges?: number; 
    }
  ) {
    return this.quotationsService.generateQuotation(
      dto.prescriptionId,
      dto.items,
      dto.deliveryCharges
    );
  }

  @Get('prescription/:prescriptionId')
  findByPrescription(@Param('prescriptionId') prescriptionId: string) {
    return this.quotationsService.findByPrescription(prescriptionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findById(id);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: { addressId: string; paymentMethod: string; notes?: string }
  ) {
    const userId = req.user.id || req.user.sub;
    return this.quotationsService.acceptQuotation(id, userId, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Request() req: any
  ) {
    const userId = req.user.id || req.user.sub;
    return this.quotationsService.rejectQuotation(id, userId);
  }
}
