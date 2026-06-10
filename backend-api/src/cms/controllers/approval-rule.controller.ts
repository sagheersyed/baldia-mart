import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { ApprovalRuleService } from '../services/approval-rule.service';

/**
 * Admin-only endpoints for managing auto-approval rules.
 */
@Controller('cms/approval-rules')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class ApprovalRuleController {
  constructor(private readonly ruleService: ApprovalRuleService) {}

  @Get()
  async list() {
    return this.ruleService.findAll();
  }

  @Post()
  async create(@Body() dto: {
    entityType: string;
    fieldName: string;
    ruleType: string;
    ruleValue?: Record<string, any>;
    description?: string;
  }) {
    return this.ruleService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.ruleService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ruleService.remove(id);
    return { deleted: true };
  }
}
