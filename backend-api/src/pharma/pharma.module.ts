import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// ── Pharma Entities ─────────────────────────────────────────────
import { Medicine } from './medicines/medicine.entity';
import { MedicineReview } from './medicines/medicine-review.entity';
import { Pharmacy } from './pharmacies/pharmacy.entity';
import { PharmacyMedicine } from './pharmacies/pharmacy-medicine.entity';
import { PharmacyInventory } from './pharmacies/pharmacy-inventory.entity';
import { Prescription } from './prescriptions/prescription.entity';
import { PrescriptionQuotation } from './prescriptions/prescription-quotation.entity';
import { MedicineSubstitution } from './substitutions/medicine-substitution.entity';
import { PharmaComplianceLog } from './compliance/pharma-compliance-log.entity';
import { PharmaRecurringOrder } from './recurring/pharma-recurring-order.entity';
import { LabTest } from './lab/lab-test.entity';
import { LabBooking } from './lab/lab-booking.entity';
import { Doctor } from './telemedicine/doctor.entity';
import { Consultation } from './telemedicine/consultation.entity';
import { DoctorAvailability } from './telemedicine/availability.entity';
import { Clinic } from './telemedicine/clinic.entity';
import { DoctorClinic } from './telemedicine/doctor-clinic.entity';
import { AvailabilityTemplate } from './telemedicine/availability-template.entity';
import { LabAvailability } from './lab/availability.entity';
import { MedicineReminder } from './reminders/medicine-reminder.entity';
import { RefillReminder } from './reminders/refill-reminder.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { FinanceModule } from '../finance/finance.module';

// ── Shared Entities (for queries only) ──────────────────────────
import { Category } from '../categories/category.entity';
import { Brand } from '../brands/brand.entity';
import { DeliveryZone } from '../delivery-zones/delivery-zone.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { SubOrder } from '../orders/sub-order.entity';
import { Address } from '../addresses/address.entity';
import { User } from '../users/user.entity';

// ── Services ────────────────────────────────────────────────────
import { MedicinesService } from './medicines/medicines.service';
import { PharmaciesService } from './pharmacies/pharmacies.service';
import { PharmacyInventoryService } from './pharmacies/pharmacy-inventory.service';
import { PrescriptionsService } from './prescriptions/prescriptions.service';
import { QuotationsService } from './prescriptions/quotations.service';
import { SubstitutionsService } from './substitutions/substitutions.service';
import { ComplianceService } from './compliance/compliance.service';
import { RecurringOrdersService } from './recurring/recurring-orders.service';
import { PharmaOrdersService } from './orders/pharma-orders.service';
import { LabService } from './lab/lab.service';
import { TelemedicineService } from './telemedicine/telemedicine.service';
import { RemindersService } from './reminders/reminders.service';
import { ReminderScheduler } from './reminders/reminder.scheduler';

// ── Controllers ─────────────────────────────────────────────────
import { MedicinesController } from './medicines/medicines.controller';
import { PharmaciesController } from './pharmacies/pharmacies.controller';
import { PharmacyB2BController } from './pharmacies/pharmacy-b2b.controller';
import { PrescriptionsController } from './prescriptions/prescriptions.controller';
import { QuotationsController } from './prescriptions/quotations.controller';
import { SubstitutionsController } from './substitutions/substitutions.controller';
import { RecurringOrdersController } from './recurring/recurring-orders.controller';
import { PharmaOrdersController } from './orders/pharma-orders.controller';
import { LabController } from './lab/lab.controller';
import { TelemedicineController } from './telemedicine/telemedicine.controller';
import { RemindersController } from './reminders/reminders.controller';
import { ComplianceController } from './compliance/compliance.controller';

// ── Queue Processors ────────────────────────────────────────────
import { PrescriptionProcessor } from './prescriptions/prescription.processor';
import { PrescriptionExpiryScheduler } from './prescriptions/prescription-expiry.scheduler';
import { ControlledSubstanceInterceptor } from './compliance/controlled-substance.interceptor';

/**
 * PharmaModule — first-class domain module for healthcare commerce.
 *
 * Design principles:
 * - Loose coupling: imports only the entities it needs from shared domains
 * - High cohesion: all pharma logic contained within this module
 * - Future microservice extractability: can be moved out with minimal refactor
 * - Reuses shared infrastructure: auth, payments, notifications via DI
 */
@Module({
  imports: [
    NotificationsModule,
    SettingsModule,
    DeliveryZonesModule,
    FinanceModule,
    TypeOrmModule.forFeature([
      // Pharma-specific
      Medicine,
      MedicineReview,
      Pharmacy,
      PharmacyMedicine,
      PharmacyInventory,
      Prescription,
      PrescriptionQuotation,
      MedicineSubstitution,
      PharmaComplianceLog,
      PharmaRecurringOrder,
      LabTest,
      LabBooking,
      Doctor,
      Consultation,
      DoctorAvailability,
      Clinic,
      DoctorClinic,
      AvailabilityTemplate,
      LabAvailability,
      MedicineReminder,
      RefillReminder,
      // Shared — read-only access for queries
      Category,
      Brand,
      DeliveryZone,
      Order,
      OrderItem,
      SubOrder,
      Address,
      User,
    ]),
    forwardRef(() => OrdersModule),
    // Async prescription verification queue
    BullModule.registerQueue({
      name: 'prescription-verification',
    }),
  ],
  controllers: [
    MedicinesController,
    PharmaciesController,
    PharmacyB2BController,
    PrescriptionsController,
    QuotationsController,
    SubstitutionsController,
    RecurringOrdersController,
    PharmaOrdersController,
    LabController,
    TelemedicineController,
    RemindersController,
    ComplianceController,
  ],
  providers: [
    MedicinesService,
    PharmaciesService,
    PharmacyInventoryService,
    PrescriptionsService,
    QuotationsService,
    SubstitutionsService,
    ComplianceService,
    RecurringOrdersService,
    PharmaOrdersService,
    LabService,
    TelemedicineService,
    RemindersService,
    ReminderScheduler,
    PrescriptionProcessor,
    PrescriptionExpiryScheduler,
    ControlledSubstanceInterceptor,
  ],
  exports: [
    MedicinesService,
    PharmaciesService,
    PharmacyInventoryService,
    PrescriptionsService,
    ComplianceService,
    LabService,
    TelemedicineService,
    RemindersService,
  ],
})
export class PharmaModule {}
