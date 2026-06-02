import { Controller, Post, Get, Delete, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

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
  async createAddress(@Req() req: Request, @Body() body: CreateAddressDto) {
    const user = req.user as any;
    return this.addressesService.create(user.id, body);
  }

  @Delete(':id')
  async deleteAddress(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.addressesService.delete(id, user.id);
  }

  @Patch(':id/default')
  async setDefaultAddress(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.addressesService.setDefault(id, user.id);
  }

  @Patch(':id')
  async updateAddress(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateAddressDto) {
    const user = req.user as any;
    return this.addressesService.update(id, user.id, body);
  }
}
