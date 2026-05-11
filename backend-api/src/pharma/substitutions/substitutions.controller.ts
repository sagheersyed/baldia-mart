import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { SubstitutionsService } from './substitutions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pharma/substitutions')
export class SubstitutionsController {
  constructor(private readonly substitutionsService: SubstitutionsService) {}

  @Get(':medicineId')
  getSubstitutes(@Param('medicineId') medicineId: string) {
    return this.substitutionsService.getSubstitutes(medicineId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: any) {
    return this.substitutionsService.create(dto);
  }

  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  deactivate(@Param('id') id: string) {
    return this.substitutionsService.deactivate(id);
  }
}
