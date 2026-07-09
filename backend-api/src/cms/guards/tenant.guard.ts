import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUser } from '../entities/tenant-user.entity';
import { TENANT_ROLES_KEY } from '../decorators/tenant-roles.decorator';

/**
 * Guard that validates:
 * 1. The request contains a tenant context (via header 'x-tenant-id' or route param 'tenantId').
 * 2. The authenticated user belongs to that tenant.
 * 3. The user's tenant role is in the allowed set (from @TenantRoles decorator).
 *
 * On success, attaches `request.tenantUser` for downstream use.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(TenantUser)
    private readonly tenantUserRepo: Repository<TenantUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    // ── Resolve tenant ID from header or route param ──
    const tenantId =
      request.headers['x-tenant-id'] ||
      request.params?.tenantId ||
      request.body?.tenantId;

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant context required. Provide x-tenant-id header or tenantId parameter.',
      );
    }

    // ── Look up membership ──
    const membership = await this.tenantUserRepo.findOne({
      where: { tenantId, userId: user.id, isActive: true },
      relations: ['tenant'],
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this business.',
      );
    }

    // ── Check tenant status ──
    if (membership.tenant && membership.tenant.status !== 'active') {
      const isManageableStatus = ['inactive', 'onboarding'].includes(membership.tenant.status);
      const isPrivilegedRole = ['owner', 'manager'].includes(membership.role);
      
      if (!(isManageableStatus && isPrivilegedRole)) {
        throw new ForbiddenException(
          `This business is currently ${membership.tenant.status}. Operations are not allowed.`,
        );
      }
    }

    // ── Check roles ──
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      TENANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(
          `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}. Your role: ${membership.role}.`,
        );
      }
    }

    // ── Attach to request for downstream ──
    request.tenantUser = membership;
    request.tenantId = tenantId;

    return true;
  }
}
