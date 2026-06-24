import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { AuthGuard } from '@nestjs/passport';

/**
 * ComplianceController — Admin-only endpoints for viewing pharma compliance audit logs.
 * All endpoints are protected by AdminRoleGuard (admin/pharmacist access only).
 */
@Controller('pharma/compliance')
@UseGuards(AuthGuard('jwt'), AdminRoleGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  /**
   * GET /pharma/compliance/logs
   * Paginated list of all compliance events with optional filters.
   */
  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
    @Query('userId') userId?: string,
    @Query('prescriptionId') prescriptionId?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1'));
    const l = Math.min(100, Math.max(1, parseInt(limit || '50')));

    if (eventType) return this.complianceService.getByEventType(eventType, p, l);
    if (severity === 'critical') return this.complianceService.getCriticalAlerts(p, l);
    if (userId) return this.complianceService.getByUser(userId, p, l);
    if (prescriptionId) return this.complianceService.getByPrescription(prescriptionId, p, l);

    return this.complianceService.getAll(p, l);
  }

  /**
   * GET /pharma/compliance/logs/order/:orderId
   * All compliance events for a specific order (for order detail audit trail).
   */
  @Get('logs/order/:orderId')
  async getByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.complianceService.getByOrder(orderId);
  }

  /**
   * GET /pharma/compliance/stats
   * Aggregate compliance statistics for the analytics dashboard.
   */
  @Get('stats')
  async getStats() {
    return this.complianceService.getStats();
  }

  /**
   * GET /pharma/compliance/critical
   * List of unresolved critical alerts (controlled substance violations, flagged prescriptions, etc.)
   */
  @Get('critical')
  async getCriticalAlerts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1'));
    const l = Math.min(100, Math.max(1, parseInt(limit || '50')));
    return this.complianceService.getCriticalAlerts(p, l);
  }
}
