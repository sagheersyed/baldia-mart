import { Controller, Patch, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('all')
  // TODO: Add AdminRoleGuard later
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() body: any) {
    return this.usersService.update(req.user.id, body);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.usersService.update(id, body);
  }
}
