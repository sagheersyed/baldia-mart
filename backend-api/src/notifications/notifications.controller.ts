import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @UseGuards(AdminRoleGuard)
  async broadcast(@Body() body: { title: string; message: string; imageUrl?: string }) {
    const stats = await this.notificationsService.sendToAllUsers(body.title, body.message, body.imageUrl);
    return { success: true, message: 'Broadcast sent to all customers', ...stats };
  }

  @Get('broadcast/recent')
  @UseGuards(AdminRoleGuard)
  async recentBroadcasts(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 10;
    return this.notificationsService.getRecentBroadcasts(Number.isFinite(parsed) ? parsed : 10);
  }

  // Backward-compatible read endpoint for older clients.
  @Get('broadcast')
  @UseGuards(AdminRoleGuard)
  async broadcastHistory(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 10;
    return this.notificationsService.getRecentBroadcasts(Number.isFinite(parsed) ? parsed : 10);
  }
}
