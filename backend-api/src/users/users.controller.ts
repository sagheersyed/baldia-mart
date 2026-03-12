import { Controller, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  async updateMe(@Req() req: Request, @Body() body: { name?: string; phoneNumber?: string; email?: string }) {
    const user = req.user as any;
    return this.usersService.update(user.id, body);
  }
}
