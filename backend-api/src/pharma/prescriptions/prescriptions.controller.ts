import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pharma/prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prescriptionsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('upload')
  upload(@Request() req: any, @Body() dto: any) {
    return this.prescriptionsService.upload(req.user.id || req.user.sub, dto);
  }

  @Post('consultation')
  requestConsultation(@Request() req: any, @Body() dto: { medicineIds: string[]; notes?: string }) {
    return this.prescriptionsService.requestConsultation(req.user.id || req.user.sub, dto.medicineIds);
  }

  @Get('my')
  myPrescriptions(@Request() req: any) {
    return this.prescriptionsService.findByUser(req.user.id || req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findById(id);
  }

  // ── Admin/Pharmacist Endpoints ────────────────────────────────

  @Get('admin/queue')
  getPendingQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prescriptionsService.getPendingQueue(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put(':id/approve')
  approve(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: { 
      notes?: string; 
      medicineIds?: string[]; 
      validUntil?: string;
      doctorName?: string;
      doctorPmdcReg?: string;
      maxRefills?: number;
      isFlagged?: boolean;
      flagReason?: string;
    },
  ) {
    return this.prescriptionsService.approve(
      id,
      req.user.id || req.user.sub,
      dto.notes,
      dto.medicineIds,
      dto.validUntil,
      dto.doctorName,
      dto.doctorPmdcReg,
      dto.maxRefills,
      dto.isFlagged,
      dto.flagReason,
    );
  }

  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason: string,
  ) {
    return this.prescriptionsService.reject(id, req.user.id || req.user.sub, reason);
  }
}
