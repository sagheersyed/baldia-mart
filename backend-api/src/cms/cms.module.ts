import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// Entities
import { Tenant } from './entities/tenant.entity';
import { TenantUser } from './entities/tenant-user.entity';
import { ChangeRequest } from './entities/change-request.entity';
import { ChangeRequestDiscussion } from './entities/change-request-discussion.entity';
import { ApprovalRule } from './entities/approval-rule.entity';
import { AuditLog } from './entities/audit-log.entity';

// Vertical entities needed by merge service & CMS controllers
import { VendorProduct } from '../vendors/vendor-product.entity';
import { Vendor } from '../vendors/vendor.entity';
import { MenuItem } from '../menu-items/menu-item.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { PharmacyMedicine } from '../pharma/pharmacies/pharmacy-medicine.entity';
import { PharmacyInventory } from '../pharma/pharmacies/pharmacy-inventory.entity';
import { Pharmacy } from '../pharma/pharmacies/pharmacy.entity';
import { Product } from '../products/product.entity';
import { Medicine } from '../pharma/medicines/medicine.entity';
import { Order } from '../orders/order.entity';
import { SubOrder } from '../orders/sub-order.entity';

// Services
import { AuditService } from './services/audit.service';
import { ApprovalRuleService } from './services/approval-rule.service';
import { ChangeRequestService } from './services/change-request.service';
import { MergeService } from './services/merge.service';

// Queue Processors
import { CmsModerationProcessor } from './queues/cms-moderation.processor';

// Controllers
import { TenantController } from './controllers/tenant.controller';
import { ChangeRequestController } from './controllers/change-request.controller';
import { ApprovalRuleController } from './controllers/approval-rule.controller';
import { VendorCmsController } from './controllers/vendor-cms.controller';
import { RestaurantCmsController } from './controllers/restaurant-cms.controller';
import { PharmacyCmsController } from './controllers/pharmacy-cms.controller';
import { MerchantOrdersController } from './controllers/merchant-orders.controller';

// Guards
import { TenantGuard } from './guards/tenant.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // CMS core entities
      Tenant,
      TenantUser,
      ChangeRequest,
      ChangeRequestDiscussion,
      ApprovalRule,
      AuditLog,
      // Vertical entities (for CMS controllers & merge service)
      VendorProduct,
      Vendor,
      MenuItem,
      Restaurant,
      PharmacyMedicine,
      PharmacyInventory,
      Pharmacy,
      Product,
      Medicine,
      Order,
      SubOrder,
    ]),
    BullModule.registerQueue({
      name: 'cms-moderation',
    }),
  ],
  controllers: [
    TenantController,
    ChangeRequestController,
    ApprovalRuleController,
    VendorCmsController,
    RestaurantCmsController,
    PharmacyCmsController,
    MerchantOrdersController,
  ],
  providers: [
    // Services
    AuditService,
    ApprovalRuleService,
    ChangeRequestService,
    MergeService,
    // Queue Processors
    CmsModerationProcessor,
    // Guards
    TenantGuard,
  ],
  exports: [
    AuditService,
    ChangeRequestService,
    TenantGuard,
    TypeOrmModule,
  ],
})
export class CmsModule {}
