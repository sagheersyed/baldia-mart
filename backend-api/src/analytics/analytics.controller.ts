import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

// TODO: Add AdminAuthGuard
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardMetrics() {
    return this.analyticsService.getDashboardMetrics();
  }
}
