import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  async getPublicSettings() {
    return this.settingsService.getPublic();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAllSettings() {
    return this.settingsService.getAll();
  }

  @Get(':key')
  async getSettingByKey(@Param('key') key: string) {
    const value = await this.settingsService.getByKey(key);
    return { key, value };
  }

  @Put(':key')
  @UseGuards(AuthGuard('jwt'))
  async updateSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.setByKey(key, value);
  }
}
