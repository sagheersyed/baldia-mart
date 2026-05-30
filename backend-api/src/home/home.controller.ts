import { Controller, Get, Query } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * Single optimized payload powering the mobile Home Screen.
   * GET /home?section=mart&zoneId=<uuid>
   */
  @Get()
  async getHome(
    @Query('section') section: 'mart' | 'food' | 'pharma' = 'mart',
    @Query('zoneId') zoneId?: string,
  ) {
    return this.homeService.getHome(section, zoneId || null);
  }
}
