import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required tenant-level roles on controller methods.
 * Usage: @TenantRoles('owner', 'manager')
 */
export const TENANT_ROLES_KEY = 'tenant_roles';
export const TenantRoles = (...roles: string[]) => SetMetadata(TENANT_ROLES_KEY, roles);
