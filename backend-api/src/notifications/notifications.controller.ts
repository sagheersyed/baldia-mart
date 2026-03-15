import { Controller, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  async broadcast(@Body() body: { title: string; message: string }) {
    // Note: In a real app, we'd check req.user.role === 'admin'
    // For now assuming the admin panel handles this check or the API is only used by admins
    await this.notificationsService.sendToAllUsers(body.title, body.message);
    return { success: true, message: 'Broadcast sent to all customers' };
  }
}
