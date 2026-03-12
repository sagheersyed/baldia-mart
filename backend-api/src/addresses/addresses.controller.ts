import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('addresses')
@UseGuards(AuthGuard('jwt'))
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  async getMyAddresses(@Req() req: Request) {
    const user = req.user as any;
    return this.addressesService.findAllByUser(user.id);
  }

  @Post()
  async createAddress(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    return this.addressesService.create(user.id, body);
  }
}
