import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), AdminRoleGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardMetrics(
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDashboardMetrics(range, startDate, endDate);
  }

  @Get('pharma')
  async getPharmaMetrics(
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPharmaMetrics(range, startDate, endDate);
  }

  @Get('pharma/regulatory')
  async getControlledReport() {
    return this.analyticsService.getControlledSubstancesReport();
  }
}
