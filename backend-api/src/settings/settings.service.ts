import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) {}

  async onModuleInit() {
    // Seed default settings if they don't exist
    await this.seedDefault('store_status', 'open');
    await this.seedDefault('delivery_base_fee', '150'); // Rs. 150 base
    await this.seedDefault('delivery_threshold_km', '3'); // Free up to 3km in base
    await this.seedDefault('delivery_per_km_fee', '20'); // Rs. 20 per extra km
    await this.seedDefault('tax_rate_percentage', '5.00');
    
    // New Global Configuration
    await this.seedDefault('contact_phone', '+92 300 1234567');
    await this.seedDefault('contact_email', 'support@baldiamart.com');
    await this.seedDefault('mart_location', 'Baldia Town, Karachi');
  }

  private async seedDefault(key: string, value: string) {
    const existing = await this.settingsRepository.findOne({ where: { key } });
    if (!existing) {
      const setting = this.settingsRepository.create({ key, value });
      await this.settingsRepository.save(setting);
    }
  }

  async getPublic() {
    return {
      delivery_base_fee: await this.getNumber('delivery_base_fee', 150),
      delivery_threshold_km: await this.getNumber('delivery_threshold_km', 3),
      delivery_per_km_fee: await this.getNumber('delivery_per_km_fee', 20),
      store_status: await this.getByKey('store_status', 'open'),
    };
  }

  async getAll(): Promise<Record<string, string>> {
    const settingsArr = await this.settingsRepository.find();
    const settingsRecord: Record<string, string> = {};
    for (const s of settingsArr) {
      settingsRecord[s.key] = s.value;
    }
    return settingsRecord;
  }

  async getByKey(key: string, defaultValue?: string): Promise<string | null> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : (defaultValue || null);
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const val = await this.getByKey(key);
    return val ? parseFloat(val) : defaultValue;
  }

  async setByKey(key: string, value: string): Promise<Setting> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingsRepository.create({ key, value });
    }
    return this.settingsRepository.save(setting);
  }
}
