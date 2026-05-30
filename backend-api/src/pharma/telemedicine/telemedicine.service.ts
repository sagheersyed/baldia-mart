import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Consultation, ConsultationStatus } from './consultation.entity';
import { DoctorAvailability } from './availability.entity';
import { Clinic } from './clinic.entity';
import { DoctorClinic } from './doctor-clinic.entity';
import { AvailabilityTemplate } from './availability-template.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TelemedicineService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(DoctorAvailability)
    private readonly availabilityRepo: Repository<DoctorAvailability>,
    @InjectRepository(Clinic)
    private readonly clinicRepo: Repository<Clinic>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepo: Repository<DoctorClinic>,
    @InjectRepository(AvailabilityTemplate)
    private readonly templateRepo: Repository<AvailabilityTemplate>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Clinics & Locations ───────────────────────────────────────

  async getAllClinics() {
    return this.clinicRepo.find({ order: { name: 'ASC' } });
  }

  async createClinic(data: Partial<Clinic>) {
    const clinic = this.clinicRepo.create(data);
    return this.clinicRepo.save(clinic);
  }

  async assignDoctorToClinic(doctorId: string, clinicId: string, fee: number, type: string) {
    const link = this.doctorClinicRepo.create({ doctorId, clinicId, consultationFee: fee, consultationType: type });
    return this.doctorClinicRepo.save(link);
  }

  async getDoctorClinics(doctorId: string) {
    return this.doctorClinicRepo.find({
      where: { doctorId },
      relations: ['clinic'],
    });
  }

  // ── Availability (Templates & Dynamic Slots) ──────────────────

  async setWeeklyTemplate(doctorClinicId: string, templates: { dayOfWeek: number; startTime: string; endTime: string; slotDuration?: number }[]) {
    // Clear old templates for this specific location
    await this.templateRepo.delete({ doctorClinicId });
    const entities = templates.map(t => this.templateRepo.create({ ...t, doctorClinicId }));
    return this.templateRepo.save(entities);
  }

  async getWeeklyTemplate(doctorClinicId: string) {
    return this.templateRepo.find({ where: { doctorClinicId }, order: { dayOfWeek: 'ASC', startTime: 'ASC' } });
  }

  async getDoctorAvailability(doctorId: string, date: string, clinicId?: string) {
    // Robust date parsing to avoid timezone shifts
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();

    // 1. Get all templates for this doctor on this day
    const query: any = { doctorId };
    if (clinicId) query.clinicId = clinicId;
    
    const links = await this.doctorClinicRepo.find({
      where: query,
      relations: ['clinic', 'availabilityTemplates'],
    });

    const results: any[] = [];

    for (const link of links) {
      const templates = link.availabilityTemplates.filter(t => t.dayOfWeek === dayOfWeek);
      
      for (const template of templates) {
        const slots = this.generateSlotsFromTemplate(template, date);
        
        // Check for booked consultations
        const booked = await this.consultationRepo.find({
          where: { 
            doctorId,
            clinicId: link.clinicId,
          }
        });

        const availableSlots = slots.filter(slot => {
          const slotStart = new Date(`${date}T${slot.startTime}:00`);
          return !booked.some(b => {
             const bStart = new Date(b.scheduledAt);
             return bStart.getTime() === slotStart.getTime();
          });
        });

        if (availableSlots.length > 0) {
          results.push({
            clinic: link.clinic,
            fee: link.consultationFee,
            type: link.consultationType,
            slots: availableSlots,
          });
        }
      }
    }

    return results;
  }

  private generateSlotsFromTemplate(template: AvailabilityTemplate, date: string) {
    const slots: { startTime: string; endTime: string }[] = [];
    const [startH, startM] = template.startTime.split(':').map(Number);
    const [endH, endM] = template.endTime.split(':').map(Number);
    const duration = template.slotDuration || 15;
    
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    
    if (duration <= 0) return []; // Safety

    while (current + duration <= end) {
      const h1 = Math.floor(current / 60);
      const m1 = current % 60;
      current += duration;
      const h2 = Math.floor(current / 60);
      const m2 = current % 60;
      
      slots.push({
        startTime: `${h1.toString().padStart(2, '0')}:${m1.toString().padStart(2, '0')}`,
        endTime: `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`,
      });
    }
    return slots;
  }

  async addAvailability(doctorId: string, slots: { date: string; startTime: string; endTime: string }[]) {
    // Keep legacy support for manual slots if needed
    const entities = slots.map(s => this.availabilityRepo.create({ ...s, doctorId }));
    return this.availabilityRepo.save(entities);
  }

  async removeAvailability(id: string) {
    const slot = await this.availabilityRepo.findOne({ where: { id } });
    if (slot?.isBooked) throw new BadRequestException('Cannot remove a booked slot');
    return this.availabilityRepo.delete(id);
  }

  // ── Doctors (Catalog) ─────────────────────────────────────────

  async getAllDoctors(specialization?: string) {
    const where = specialization ? { specialization, isActive: true } : { isActive: true };
    return this.doctorRepo.find({ where, order: { rating: 'DESC' } });
  }

  async getDoctorById(id: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async createDoctor(data: Partial<Doctor>) {
    const doctor = this.doctorRepo.create(data);
    const saved = await this.doctorRepo.save(doctor);
    
    // Generate default slots for next 7 days
    await this.generateDefaultSlots(saved.id);
    
    return saved;
  }

  async updateDoctor(id: string, data: Partial<Doctor>) {
    const doctor = await this.getDoctorById(id);
    Object.assign(doctor, data);
    return this.doctorRepo.save(doctor);
  }

  private async generateDefaultSlots(doctorId: string) {
    const slots: Partial<DoctorAvailability>[] = [];
    const days = 7;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Default: 9:00 AM to 5:00 PM, 15 min slots
      let current = 9 * 60; // 9:00 AM in minutes
      const end = 17 * 60; // 5:00 PM
      
      while (current < end) {
        const h1 = Math.floor(current / 60);
        const m1 = current % 60;
        current += 15;
        const h2 = Math.floor(current / 60);
        const m2 = current % 60;
        
        slots.push({
          doctorId,
          date: dateStr,
          startTime: `${h1.toString().padStart(2, '0')}:${m1.toString().padStart(2, '0')}`,
          endTime: `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`,
        });
      }
    }
    await this.availabilityRepo.save(slots);
  }

  async emergencyCancel(doctorId: string, reason: string) {
    // 1. Mark all future slots for this doctor as unavailable
    await this.availabilityRepo.update(
      { doctorId, date: MoreThanOrEqual(new Date().toISOString().split('T')[0]) },
      { isAvailable: false }
    );
    
    // 2. Find all scheduled consultations
    const consultations = await this.consultationRepo.find({
      where: { 
        doctorId, 
        status: 'scheduled',
        scheduledAt: MoreThanOrEqual(new Date())
      },
      relations: ['user']
    });
    
    for (const cons of consultations) {
      cons.status = 'cancelled';
      cons.doctorSummary = `Emergency Cancellation: ${reason}`;
      await this.consultationRepo.save(cons);
      
      // Notify user
      if (cons.user?.fcmToken) {
        await this.notificationsService.sendToUser(
          cons.userId,
          cons.user.fcmToken,
          'Consultation Cancelled ⚠️',
          `Your appointment with Dr. ${cons.doctor?.name || 'your doctor'} has been cancelled due to an emergency: ${reason}`
        );
      }
    }
    
    return { cancelledCount: consultations.length };
  }

  async deleteDoctor(id: string) {
    const doctor = await this.getDoctorById(id);
    // Soft deactivate instead of hard delete
    doctor.isActive = false;
    return this.doctorRepo.save(doctor);
  }

  // ── Consultations ─────────────────────────────────────────────

  async bookConsultation(userId: string, dto: {
    doctorId: string;
    scheduledAt: Date;
    paymentMethod: string;
    userNotes?: string;
    visitType?: 'video' | 'physical';
    availabilityId?: string;
  }) {
    // 1. Fetch Doctor for fee
    const doctor = await this.getDoctorById(dto.doctorId);

    // 2. Mark slot as booked if provided
    if (dto.availabilityId) {
      await this.availabilityRepo.update(dto.availabilityId, { isBooked: true });
    }

    // 3. Create Consultation
    const consultation = this.consultationRepo.create({
      ...dto,
      userId,
      feePaid: doctor.consultationFee,
      status: 'scheduled',
      videoRoomId: `room-${uuidv4().slice(0, 8)}`,
    });

    return this.consultationRepo.save(consultation);
  }

  async getMyConsultations(userId: string) {
    return this.consultationRepo.find({
      where: { userId },
      relations: ['doctor'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async updateStatus(
    id: string, 
    status?: ConsultationStatus, 
    summary?: string, 
    prescriptionId?: string,
    meetingUrl?: string
  ) {
    const consultation = await this.consultationRepo.findOne({ where: { id } });
    if (!consultation) throw new NotFoundException('Consultation not found');
    
    if (status) consultation.status = status;
    if (summary) consultation.doctorSummary = summary;
    if (prescriptionId) consultation.prescriptionId = prescriptionId;
    if (meetingUrl) consultation.meetingUrl = meetingUrl;
    
    return this.consultationRepo.save(consultation);
  }

  async getAllConsultations(page = 1, limit = 20) {
    const [data, total] = await this.consultationRepo.findAndCount({
      order: { scheduledAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user', 'doctor'],
    });
    return { data, total, page, limit };
  }
}
