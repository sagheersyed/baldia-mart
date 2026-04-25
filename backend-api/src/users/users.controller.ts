import { Controller, Patch, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('all')
  @UseGuards(AdminRoleGuard)
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() body: UpdateMeDto) {
    return this.usersService.update(req.user.id, body);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.usersService.update(id, body);
  }
}
