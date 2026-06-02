import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
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
  async getControlledReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('pharmacyId') pharmacyId?: string,
    @Query('format') format?: string,
    @Res() res?: Response,
  ) {
    const data = await this.analyticsService.getControlledSubstancesReport({
      startDate,
      endDate,
      pharmacyId,
    });

    if (format === 'csv' && res) {
      const csvHeaders = [
        'OrderId', 'OrderDate', 'CustomerName', 'CustomerPhone',
        'PharmacyName', 'PharmacyLicense', 'MedicineName', 'GenericName',
        'Quantity', 'Price', 'PrescriptionId', 'DoctorName', 'DoctorPmdcReg',
        'PatientName', 'PrescriptionDate'
      ].join(',');

      const csvRows = data.map((row: any) => {
        return [
          row.orderId || '',
          row.orderDate ? new Date(row.orderDate).toISOString() : '',
          `"${(row.customerName || '').replace(/"/g, '""')}"`,
          `"${(row.customerPhone || '').replace(/"/g, '""')}"`,
          `"${(row.pharmacyName || '').replace(/"/g, '""')}"`,
          `"${(row.pharmacyLicense || '').replace(/"/g, '""')}"`,
          `"${(row.medicineName || '').replace(/"/g, '""')}"`,
          `"${(row.genericName || '').replace(/"/g, '""')}"`,
          row.quantity || 0,
          row.price || 0,
          row.prescriptionId || '',
          `"${(row.doctorName || '').replace(/"/g, '""')}"`,
          `"${(row.doctorPmdcReg || '').replace(/"/g, '""')}"`,
          `"${(row.patientName || '').replace(/"/g, '""')}"`,
          row.prescriptionDate ? new Date(row.prescriptionDate).toISOString().split('T')[0] : '',
        ].join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=controlled_substances_report.csv');
      return res.status(200).send(csvContent);
    }

    if (res) {
      return res.status(200).json(data);
    }
    return data;
  }
}
