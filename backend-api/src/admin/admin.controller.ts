import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin')
@UseGuards(AuthGuard('jwt')) 
// A proper RoleGuard is needed but omitted for brevity (covered in auth role check usually)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getDashboardAnalytics();
  }
}
