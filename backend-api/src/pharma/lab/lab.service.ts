import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { LabTest } from './lab-test.entity';
import { LabBooking, LabBookingStatus } from './lab-booking.entity';
import { LabAvailability } from './availability.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class LabService {
  constructor(
    @InjectRepository(LabTest)
    private readonly testRepo: Repository<LabTest>,
    @InjectRepository(LabBooking)
    private readonly bookingRepo: Repository<LabBooking>,
    @InjectRepository(LabAvailability)
    private readonly availabilityRepo: Repository<LabAvailability>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Availability (Slots) ──────────────────────────────────────

  async addAvailability(slots: { date: string; startTime: string; endTime: string; maxCapacity: number }[]) {
    const entities = slots.map(s => this.availabilityRepo.create(s));
    return this.availabilityRepo.save(entities);
  }

  async getAvailability(date?: string) {
    const where: any = { isActive: true };
    if (date) where.date = date;
    return this.availabilityRepo.find({ where, order: { date: 'ASC', startTime: 'ASC' } });
  }

  async removeAvailability(id: string) {
    return this.availabilityRepo.delete(id);
  }

  // ── Lab Tests (Catalog) ───────────────────────────────────────

  async getAllTests(category?: string) {
    const where = category ? { category, isActive: true } : { isActive: true };
    return this.testRepo.find({ where, order: { name: 'ASC' } });
  }

  async getTestById(id: string) {
    const test = await this.testRepo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Lab test not found');
    return test;
  }

  async createTest(data: Partial<LabTest>) {
    const test = this.testRepo.create(data);
    const saved = await this.testRepo.save(test);
    
    // Generate default slots if this is a new lab collection capability
    // (In our simplified model, we generate them for tomorrow onwards)
    await this.generateDefaultSlots();
    
    return saved;
  }

  private async generateDefaultSlots() {
    const slots: Partial<LabAvailability>[] = [];
    const days = 7;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Default: 8:00 AM to 8:00 PM, 1 hour slots, max 5 bookings per slot
      let current = 8 * 60; 
      const end = 20 * 60;
      
      while (current < end) {
        const h1 = Math.floor(current / 60);
        const m1 = current % 60;
        current += 60;
        const h2 = Math.floor(current / 60);
        const m2 = current % 60;
        
        slots.push({
          date: dateStr,
          startTime: `${h1.toString().padStart(2, '0')}:${m1.toString().padStart(2, '0')}`,
          endTime: `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`,
          maxCapacity: 5,
        });
      }
    }
    await this.availabilityRepo.save(slots);
  }

  async emergencyCancel(date: string, reason: string) {
    await this.availabilityRepo.update({ date }, { isActive: false });
    
    const bookings = await this.bookingRepo.find({
      where: { 
        scheduledDate: MoreThanOrEqual(new Date(date)),
        status: 'pending'
      },
      relations: ['user']
    });
    
    for (const b of bookings) {
      b.status = 'cancelled';
      b.notes = (b.notes || '') + ` | Emergency Cancellation: ${reason}`;
      await this.bookingRepo.save(b);
      
      if (b.user?.fcmToken) {
        await this.notificationsService.sendToUser(
          b.userId,
          b.user.fcmToken,
          'Lab Booking Cancelled ⚠️',
          `Your lab collection for ${date} has been cancelled: ${reason}`
        );
      }
    }
    return { cancelledCount: bookings.length };
  }

  async updateTest(id: string, data: Partial<LabTest>) {
    const test = await this.getTestById(id);
    Object.assign(test, data);
    return this.testRepo.save(test);
  }

  async deleteTest(id: string) {
    const test = await this.getTestById(id);
    // Soft deactivate instead of hard delete
    test.isActive = false;
    return this.testRepo.save(test);
  }

  // ── Lab Bookings ──────────────────────────────────────────────

  async createBooking(userId: string, dto: {
    testIds: string[];
    scheduledDate: Date;
    timeSlot: string;
    addressId: string;
    paymentMethod: string;
    notes?: string;
    availabilityId?: string;
  }) {
    // 1. Fetch Tests to calculate total
    const tests = await this.testRepo.find({ where: { id: In(dto.testIds) } });
    if (tests.length === 0) throw new BadRequestException('No valid tests selected');

    const totalAmount = tests.reduce((sum, test) => sum + Number(test.price), 0);

    // 2. Decrement capacity if slot provided
    if (dto.availabilityId) {
      const slot = await this.availabilityRepo.findOne({ where: { id: dto.availabilityId } });
      if (slot) {
        if (slot.currentBookings >= slot.maxCapacity) {
          throw new BadRequestException('Slot is fully booked');
        }
        await this.availabilityRepo.increment({ id: dto.availabilityId }, 'currentBookings', 1);
      }
    }

    // 3. Create Booking
    const booking = this.bookingRepo.create({
      ...dto,
      userId,
      totalAmount,
      status: 'pending',
    });

    return this.bookingRepo.save(booking);
  }

  async getMyBookings(userId: string) {
    return this.bookingRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBookingDetails(id: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['address', 'user'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    
    // Fetch test details manually as we store IDs in an array
    const tests = await this.testRepo.find({ where: { id: In(booking.testIds) } });
    
    return { ...booking, tests };
  }

  async updateBookingStatus(id: string, status: LabBookingStatus, reportUrl?: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    
    booking.status = status;
    if (reportUrl) booking.reportUrl = reportUrl;
    
    return this.bookingRepo.save(booking);
  }

  async getAllBookings(page = 1, limit = 20) {
    const [data, total] = await this.bookingRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
    return { data, total, page, limit };
  }
}
