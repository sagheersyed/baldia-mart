import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) { }

  async onModuleInit() {
    // Seed default settings if they don't exist
    await this.seedDefault('store_status', 'open');
    await this.seedDefault('delivery_base_fee', '80'); // Rs. 150 base
    await this.seedDefault('delivery_threshold_km', '3'); // Free up to 3km in base
    await this.seedDefault('delivery_per_km_fee', '5'); // Rs. 20 per extra km
    await this.seedDefault('tax_rate_percentage', '1.00');

    // New Global Configuration
    await this.seedDefault('contact_phone', '+92 300 1234567');
    await this.seedDefault('contact_email', 'support@baldiamart.com');
    await this.seedDefault('mart_location', 'Baldia Town, Karachi');
    await this.seedDefault('mart_locations_list', JSON.stringify([
      { id: '1', name: 'Baldia Town Main', address: 'Plot 12, Sector 5, Baldia Town', lat: 24.9123, lng: 66.9876 },
      { id: '2', name: 'Orangi Express', address: 'Shop 4, Orangi Town', lat: 24.9345, lng: 67.0123 },
    ]));
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
      contact_phone: await this.getByKey('contact_phone', '+92 341 2248616'),
      contact_email: await this.getByKey('contact_email', 'support@baldiamart.com'),
      mart_locations: JSON.parse(await this.getByKey('mart_locations_list', '[]') as string),
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
