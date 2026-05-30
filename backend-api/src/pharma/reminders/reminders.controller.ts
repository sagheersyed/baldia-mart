import { 
  Controller, Get, Post, Body, Param, Put, Delete, UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';
import { RemindersService } from './reminders.service';

@Controller('pharma/reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  async create(@GetUser('id') userId: string, @Body() dto: any) {
    return this.remindersService.create(userId, dto);
  }

  @Get()
  async getAll(@GetUser('id') userId: string) {
    return this.remindersService.findByUser(userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @GetUser('id') userId: string, @Body() dto: any) {
    return this.remindersService.update(id, userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.remindersService.delete(id, userId);
  }

  // ── Refills ──────────────────────────────────────────────────

  @Get('refills')
  async getRefills(@GetUser('id') userId: string) {
    return this.remindersService.getRefills(userId);
  }

  @Post('refills')
  async createRefill(@GetUser('id') userId: string, @Body() dto: { medicineName: string; daysSupply?: number }) {
    return this.remindersService.createRefill(userId, dto.medicineName, dto.daysSupply);
  }

  @Delete('refills/:id')
  async deleteRefill(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.remindersService.deleteRefill(id, userId);
  }
}
