import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RecurringOrdersService } from './recurring-orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pharma/recurring')
@UseGuards(JwtAuthGuard)
export class RecurringOrdersController {
  constructor(private readonly recurringService: RecurringOrdersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.recurringService.create(req.user.id || req.user.sub, dto);
  }

  @Get('my')
  mySubscriptions(@Request() req: any) {
    return this.recurringService.findByUser(req.user.id || req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recurringService.findById(id);
  }

  @Put(':id/pause')
  pause(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.recurringService.pause(id, reason);
  }

  @Put(':id/resume')
  resume(@Param('id') id: string) {
    return this.recurringService.resume(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.recurringService.cancel(id);
  }
}
