import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// ── Pharma Entities ─────────────────────────────────────────────
import { Medicine } from './medicines/medicine.entity';
import { Pharmacy } from './pharmacies/pharmacy.entity';
import { PharmacyInventory } from './pharmacies/pharmacy-inventory.entity';
import { Prescription } from './prescriptions/prescription.entity';
import { MedicineSubstitution } from './substitutions/medicine-substitution.entity';
import { PharmaComplianceLog } from './compliance/pharma-compliance-log.entity';
import { PharmaRecurringOrder } from './recurring/pharma-recurring-order.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';

// ── Shared Entities (for queries only) ──────────────────────────
import { Category } from '../categories/category.entity';
import { Brand } from '../brands/brand.entity';
import { DeliveryZone } from '../delivery-zones/delivery-zone.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { Address } from '../addresses/address.entity';
import { User } from '../users/user.entity';

// ── Services ────────────────────────────────────────────────────
import { MedicinesService } from './medicines/medicines.service';
import { PharmaciesService } from './pharmacies/pharmacies.service';
import { PrescriptionsService } from './prescriptions/prescriptions.service';
import { SubstitutionsService } from './substitutions/substitutions.service';
import { ComplianceService } from './compliance/compliance.service';
import { RecurringOrdersService } from './recurring/recurring-orders.service';
import { PharmaOrdersService } from './orders/pharma-orders.service';

// ── Controllers ─────────────────────────────────────────────────
import { MedicinesController } from './medicines/medicines.controller';
import { PharmaciesController } from './pharmacies/pharmacies.controller';
import { PrescriptionsController } from './prescriptions/prescriptions.controller';
import { SubstitutionsController } from './substitutions/substitutions.controller';
import { RecurringOrdersController } from './recurring/recurring-orders.controller';
import { PharmaOrdersController } from './orders/pharma-orders.controller';

// ── Queue Processors ────────────────────────────────────────────
import { PrescriptionProcessor } from './prescriptions/prescription.processor';

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
    TypeOrmModule.forFeature([
      // Pharma-specific
      Medicine,
      Pharmacy,
      PharmacyInventory,
      Prescription,
      MedicineSubstitution,
      PharmaComplianceLog,
      PharmaRecurringOrder,
      // Shared — read-only access for queries
      Category,
      Brand,
      DeliveryZone,
      Order,
      OrderItem,
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
    PrescriptionsController,
    SubstitutionsController,
    RecurringOrdersController,
    PharmaOrdersController,
  ],
  providers: [
    MedicinesService,
    PharmaciesService,
    PrescriptionsService,
    SubstitutionsService,
    ComplianceService,
    RecurringOrdersService,
    PharmaOrdersService,
    PrescriptionProcessor,
  ],
  exports: [
    MedicinesService,
    PharmaciesService,
    PrescriptionsService,
    ComplianceService,
  ],
})
export class PharmaModule {}
