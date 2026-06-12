import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ChangeRequest } from '../entities/change-request.entity';
import { AuditService } from './audit.service';

// Entity class map — maps entity_type strings to their TypeORM entity classes
import { Product } from '../../products/product.entity';
import { VendorProduct } from '../../vendors/vendor-product.entity';
import { MenuItem } from '../../menu-items/menu-item.entity';
import { PharmacyMedicine } from '../../pharma/pharmacies/pharmacy-medicine.entity';
import { PharmacyInventory } from '../../pharma/pharmacies/pharmacy-inventory.entity';
import { Vendor } from '../../vendors/vendor.entity';
import { Restaurant } from '../../restaurants/restaurant.entity';
import { Pharmacy } from '../../pharma/pharmacies/pharmacy.entity';
import { Medicine } from '../../pharma/medicines/medicine.entity';

interface PatchOp {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: any;
}

/**
 * Polymorphic Merge Service — applies approved JSON patches to the
 * corresponding live entity tables within a database transaction.
 */
@Injectable()
export class MergeService {
  private readonly logger = new Logger(MergeService.name);

  private readonly entityMap: Record<string, any> = {
    Product,
    VendorProduct,
    MenuItem,
    Medicine,
    PharmacyMedicine,
    PharmacyInventory,
    Vendor,
    Restaurant,
    Pharmacy,
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async applyChangeRequest(cr: ChangeRequest): Promise<{ success: boolean; error?: string }> {
    const EntityClass = this.entityMap[cr.entityType];
    if (!EntityClass) {
      return { success: false, error: `Unknown entity type: ${cr.entityType}` };
    }

    try {
      await this.dataSource.transaction(async (manager: EntityManager) => {
        switch (cr.actionType) {
          case 'CREATE':
            await this.handleCreate(manager, EntityClass, cr);
            break;
          case 'UPDATE':
            await this.handleUpdate(manager, EntityClass, cr);
            break;
          case 'DELETE':
            await this.handleDelete(manager, EntityClass, cr);
            break;
          default:
            throw new Error(`Unknown action type: ${cr.actionType}`);
        }
      });

      await this.auditService.log({
        tenantId: cr.tenantId,
        userId: cr.requestedBy,
        action: `${cr.entityType.toLowerCase()}.${cr.actionType.toLowerCase()}_merged`,
        changeRequestId: cr.id,
        payload: { entityId: cr.entityId, actionType: cr.actionType },
      });

      return { success: true };
    } catch (err) {
      this.logger.error(`Merge failed for CR ${cr.id}: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  private async handleCreate(
    manager: EntityManager,
    EntityClass: any,
    cr: ChangeRequest,
  ): Promise<void> {
    const repo = manager.getRepository(EntityClass);
    
    // ── Field Mapping ──
    const patchData = { ...cr.patchData };
    
    // Product: Map 'stockQty' (Mobile DTO) to 'stockQuantity' (DB Entity)
    if (cr.entityType === 'Product') {
      if (patchData.stockQty !== undefined && patchData.stockQuantity === undefined) {
        patchData.stockQuantity = patchData.stockQty;
      }
    }
    // Medicine: Map 'stockQty' to 'stockQuantity' if mixed up
    if (cr.entityType === 'Medicine') {
      if (patchData.stockQty !== undefined && patchData.stockQuantity === undefined) {
        patchData.stockQuantity = patchData.stockQty;
      }
    }

    const entity = repo.create(patchData);
    const saved = await repo.save(entity);

    await manager.getRepository(ChangeRequest).update(cr.id, {
      entityId: (saved as any).id,
    });

    // Auto-link new Product to VendorProduct
    if (cr.entityType === 'Product') {
      const TenantEntity = this.entityMap['Tenant'] || (await import('../entities/tenant.entity')).Tenant;
      const tenant = await manager.getRepository(TenantEntity).findOne({ where: { id: cr.tenantId } });
      if (tenant && (tenant.type === 'grocery' || tenant.type === 'mart') && tenant.entityId) {
        const VendorProductEntity = this.entityMap['VendorProduct'] || (await import('../../vendors/vendor-product.entity')).VendorProduct;
        const vpRepo = manager.getRepository(VendorProductEntity);
        await vpRepo.save(vpRepo.create({
          vendorId: tenant.entityId,
          productId: (saved as any).id,
          price: (cr.patchData as any).price || 0,
          stockQty: (cr.patchData as any).stockQty || 0,
          isAvailable: true,
        }));
      }
    }

    // Auto-link new Medicine to PharmacyInventory
    if (cr.entityType === 'Medicine') {
      const TenantEntity = this.entityMap['Tenant'] || (await import('../entities/tenant.entity')).Tenant;
      const tenant = await manager.getRepository(TenantEntity).findOne({ where: { id: cr.tenantId } });
      if (tenant && tenant.type === 'pharmacy' && tenant.entityId) {
        const PharmacyInventoryEntity = this.entityMap['PharmacyInventory'] || (await import('../../pharma/pharmacies/pharmacy-inventory.entity')).PharmacyInventory;
        const pmRepo = manager.getRepository(PharmacyInventoryEntity);
        await pmRepo.save(pmRepo.create({
          pharmacyId: tenant.entityId,
          medicineId: (saved as any).id,
          stockQuantity: (cr.patchData as any).stockQuantity ?? (cr.patchData as any).stockQty ?? 0,
          sellingPrice: (cr.patchData as any).mrp ?? (cr.patchData as any).price ?? 0,
          isAvailable: true,
        }));
      }
    }
  }

  private async handleUpdate(
    manager: EntityManager,
    EntityClass: any,
    cr: ChangeRequest,
  ): Promise<void> {
    if (!cr.entityId) throw new Error('UPDATE requires entityId');
    const repo = manager.getRepository(EntityClass);
    const entity = await repo.findOne({ where: { id: cr.entityId } });
    if (!entity) throw new Error(`${cr.entityType} ${cr.entityId} not found`);

    const patches: PatchOp[] = Array.isArray(cr.patchData) ? cr.patchData : [];
    const updatePayload: Record<string, any> = {};

    for (const patch of patches) {
      const field = patch.path.replace(/^\//, '');
      // Map field names if necessary for updates too
      let dbField = field;
      if (cr.entityType === 'Product' && field === 'stockQty') dbField = 'stockQuantity';
      
      switch (patch.op) {
        case 'replace':
        case 'add':
          updatePayload[dbField] = patch.value;
          break;
        case 'remove':
          updatePayload[dbField] = null;
          break;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await repo.update(cr.entityId, updatePayload);
    }
  }

  private async handleDelete(
    manager: EntityManager,
    EntityClass: any,
    cr: ChangeRequest,
  ): Promise<void> {
    if (!cr.entityId) throw new Error('DELETE requires entityId');
    const repo = manager.getRepository(EntityClass);
    const entity = await repo.findOne({ where: { id: cr.entityId } });
    if (!entity) throw new Error(`${cr.entityType} ${cr.entityId} not found`);

    if ('isActive' in entity) await repo.update(cr.entityId, { isActive: false } as any);
    else if ('isAvailable' in entity) await repo.update(cr.entityId, { isAvailable: false } as any);
    else await repo.delete(cr.entityId);
  }
}
