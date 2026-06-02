import { 
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';
import { TelemedicineService } from './telemedicine.service';
import { ConsultationStatus } from './consultation.entity';

@Controller('pharma/telemedicine')
export class TelemedicineController {
  constructor(private readonly teleService: TelemedicineService) {}

  // ── Public/User Endpoints ─────────────────────────────────────

  @Get('doctors')
  async getDoctors(@Query('specialization') specialization?: string) {
    return this.teleService.getAllDoctors(specialization);
  }

  @Get('doctors/:id')
  async getDoctor(@Param('id') id: string) {
    return this.teleService.getDoctorById(id);
  }

  @Post('consultations')
  @UseGuards(JwtAuthGuard)
  async book(@GetUser('id') userId: string, @Body() dto: any) {
    return this.teleService.bookConsultation(userId, dto);
  }

  @Get('consultations/my')
  @UseGuards(JwtAuthGuard)
  async getMy(@GetUser('id') userId: string) {
    return this.teleService.getMyConsultations(userId);
  }

  // ── Admin/Doctor Endpoints ────────────────────────────────────

  @Patch('consultations/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string, 
    @Body('status') status: ConsultationStatus,
    @Body('summary') summary?: string,
    @Body('prescriptionId') prescriptionId?: string,
  ) {
    return this.teleService.updateStatus(id, status, summary, prescriptionId);
  }

  @Patch('consultations/:id/meeting')
  @UseGuards(JwtAuthGuard)
  async updateMeetingUrl(@Param('id') id: string, @Body('meetingUrl') meetingUrl: string) {
    return this.teleService.updateStatus(id, undefined, undefined, undefined, meetingUrl);
  }

  @Patch('consultations/:id/summary')
  @UseGuards(JwtAuthGuard)
  async updateSummary(@Param('id') id: string, @Body('summary') summary: string) {
    return this.teleService.updateStatus(id, undefined, summary);
  }

  @Get('admin/consultations')
  @UseGuards(JwtAuthGuard)
  async getAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.teleService.getAllConsultations(page, limit);
  }

  @Post('admin/doctors')
  @UseGuards(JwtAuthGuard)
  async createDoctor(@Body() dto: any) {
    return this.teleService.createDoctor(dto);
  }

  @Put('admin/doctors/:id')
  @UseGuards(JwtAuthGuard)
  async updateDoctor(@Param('id') id: string, @Body() dto: any) {
    return this.teleService.updateDoctor(id, dto);
  }

  @Delete('admin/doctors/:id')
  @UseGuards(JwtAuthGuard)
  async deleteDoctor(@Param('id') id: string) {
    return this.teleService.deleteDoctor(id);
  }

  @Post('admin/doctors/:id/emergency-cancel')
  @UseGuards(JwtAuthGuard)
  async emergencyCancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.teleService.emergencyCancel(id, reason);
  }

  // ── Clinics & Templates ──────────────────────────────────────
  
  @Get('clinics')
  async getAllClinics() {
    return this.teleService.getAllClinics();
  }

  @Post('admin/clinics')
  @UseGuards(JwtAuthGuard)
  async createClinic(@Body() dto: any) {
    return this.teleService.createClinic(dto);
  }

  @Post('admin/doctors/:id/assign-clinic')
  @UseGuards(JwtAuthGuard)
  async assignClinic(
    @Param('id') doctorId: string,
    @Body('clinicId') clinicId: string,
    @Body('fee') fee: number,
    @Body('type') type: string,
  ) {
    return this.teleService.assignDoctorToClinic(doctorId, clinicId, fee, type);
  }

  @Post('admin/doctor-clinics/:id/template')
  @UseGuards(JwtAuthGuard)
  async setTemplate(@Param('id') doctorClinicId: string, @Body('templates') templates: any[]) {
    return this.teleService.setWeeklyTemplate(doctorClinicId, templates);
  }

  @Get('doctor-clinics/:id/template')
  async getTemplate(@Param('id') doctorClinicId: string) {
    return this.teleService.getWeeklyTemplate(doctorClinicId);
  }

  @Get('doctors/:id/clinics')
  async getDoctorClinics(@Param('id') id: string) {
    return this.teleService.getDoctorClinics(id);
  }

  // ── Availability ──────────────────────────────────────────────

  @Get('doctors/:id/availability')
  async getAvailability(
    @Param('id') id: string, 
    @Query('date') date: string,
    @Query('clinicId') clinicId?: string
  ) {
    return this.teleService.getDoctorAvailability(id, date, clinicId);
  }

  @Post('admin/doctors/:id/availability')
  @UseGuards(JwtAuthGuard)
  async addAvailability(@Param('id') id: string, @Body('slots') slots: any[]) {
    return this.teleService.addAvailability(id, slots);
  }

  @Delete('admin/availability/:id')
  @UseGuards(JwtAuthGuard)
  async removeAvailability(@Param('id') id: string) {
    return this.teleService.removeAvailability(id);
  }
}
