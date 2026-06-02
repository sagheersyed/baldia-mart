import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';
import { SettingsGateway } from './settings.gateway';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
    private settingsGateway: SettingsGateway,
  ) { }

  async onModuleInit() {
    // Seed default settings if they don't exist
    await this.seedDefault('store_status', 'open');
    await this.seedDefault('delivery_base_fee', '80'); // Rs. 150 base
    await this.seedDefault('delivery_threshold_km', '3'); // Free up to 3km in base
    await this.seedDefault('delivery_per_km_fee', '5'); // Rs. 20 per extra km
    await this.seedDefault('delivery_max_radius_km', '10'); // Max delivery zone
    await this.seedDefault('tax_rate_percentage', '1.00');
    await this.seedDefault('multi_restaurant_max_distance_km', '0.4');

    // Pharma Delivery Configuration
    await this.seedDefault('pharma_delivery_base_fee', '150');
    await this.seedDefault('pharma_delivery_threshold_km', '0');
    await this.seedDefault('pharma_delivery_per_km_fee', '20');
    await this.seedDefault('pharma_delivery_max_radius_km', '15');
    
    // Healthcare & Expert Mode
    await this.seedDefault('pharma_skip_prescription_verification', 'false');
    await this.seedDefault('feature_pharma_lab_tests_enabled', 'false');
    await this.seedDefault('feature_pharma_doctor_consultations_enabled', 'false');
    await this.seedDefault('feature_pharma_reminders_enabled', 'false');
    await this.seedDefault('feature_pharma_refills_enabled', 'false');
    
    // Feature Visibility
    await this.seedDefault('feature_show_mart', 'true');
    await this.seedDefault('feature_show_restaurants', 'true');
    await this.seedDefault('feature_show_brands', 'true');
    await this.seedDefault('feature_chat_enabled', 'true');
    await this.seedDefault('chat_enable_replies', 'true');
    await this.seedDefault('chat_enable_images', 'true');
    await this.seedDefault('feature_rashan_enabled', 'true');
    await this.seedDefault('feature_show_pharma', 'true');

    // Rashan Service Pricing Configuration
    await this.seedDefault('rashan_base_fee', '750');
    await this.seedDefault('rashan_surcharge_medium', '200');
    await this.seedDefault('rashan_surcharge_heavy', '450');
    await this.seedDefault('rashan_floor_surcharge_low', '150');
    await this.seedDefault('rashan_floor_surcharge_high', '300');
    await this.seedDefault('rashan_placement_fee', '150');

    // New Global Configuration
    await this.seedDefault('contact_phone', '+92 300 1234567');
    await this.seedDefault('contact_email', 'support@baldiamart.com');
    await this.seedDefault('social_facebook', 'https://facebook.com/baldiamart');
    await this.seedDefault('social_instagram', 'https://instagram.com/baldiamart');
    await this.seedDefault('mart_location', 'Baldia Town, Karachi');
    await this.seedDefault('mart_locations_list', JSON.stringify([
      { id: '1', name: 'Baldia Town Main', address: 'Plot 12, Sector 5, Baldia Town', lat: 24.9123, lng: 66.9876 },
      { id: '2', name: 'Orangi Express', address: 'Shop 4, Orangi Town', lat: 24.9345, lng: 67.0123 },
    ]));

    // Auth Configuration
    await this.seedDefault('auth_customer_mpin_enabled', 'true');
    await this.seedDefault('auth_customer_otp_enabled', 'true');
    await this.seedDefault('auth_customer_google_enabled', 'true');
    await this.seedDefault('auth_rider_mpin_enabled', 'true');
    await this.seedDefault('auth_rider_otp_enabled', 'true');

    // Pharma Conditions Catalog
    await this.seedDefault('pharma_conditions_list', JSON.stringify([
      { id: 'fever', label: 'Fever & Pain', icon: 'thermometer-outline', bg: '#FEE2E2', color: '#DC2626' },
      { id: 'cold', label: 'Cold & Cough', icon: 'water-outline', bg: '#E0F2FE', color: '#0369A1' },
      { id: 'stomach', label: 'Stomach Care', icon: 'medkit-outline', bg: '#D1FAE5', color: '#059669' },
      { id: 'skin', label: 'Skin Care', icon: 'sparkles-outline', bg: '#FCE7F3', color: '#DB2777' },
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
    const all = await this.getAll();
    const getVal = (key: string, def: string) => all[key] || def;
    const getNum = (key: string, def: number) => all[key] ? parseFloat(all[key]) : def;

    return {
      delivery_base_fee: getNum('delivery_base_fee', 150),
      delivery_threshold_km: getNum('delivery_threshold_km', 3),
      delivery_per_km_fee: getNum('delivery_per_km_fee', 20),
      delivery_max_radius_km: getNum('delivery_max_radius_km', 10),
      store_status: getVal('store_status', 'open'),
      contact_phone: getVal('contact_phone', '+92 341 2248616'),
      contact_email: getVal('contact_email', 'support@baldiamart.com'),
      social_facebook: getVal('social_facebook', 'https://facebook.com/baldiamart'),
      social_instagram: getVal('social_instagram', 'https://instagram.com/baldiamart'),
      mart_locations: JSON.parse(getVal('mart_locations_list', '[]')),
      auth_customer_mpin_enabled: getVal('auth_customer_mpin_enabled', 'true') === 'true',
      auth_customer_otp_enabled: getVal('auth_customer_otp_enabled', 'true') === 'true',
      auth_customer_google_enabled: getVal('auth_customer_google_enabled', 'true') === 'true',
      auth_rider_mpin_enabled: getVal('auth_rider_mpin_enabled', 'true') === 'true',
      auth_rider_otp_enabled: getVal('auth_rider_otp_enabled', 'true') === 'true',
      feature_show_mart: getVal('feature_show_mart', 'true') === 'true',
      feature_show_restaurants: getVal('feature_show_restaurants', 'true') === 'true',
      feature_show_brands: getVal('feature_show_brands', 'true') === 'true',
      feature_chat_enabled: getVal('feature_chat_enabled', 'true') === 'true',
      chat_enable_replies: getVal('chat_enable_replies', 'true') === 'true',
      chat_enable_images: getVal('chat_enable_images', 'true') === 'true',
      feature_rashan_enabled: getVal('feature_rashan_enabled', 'true') === 'true',
      feature_show_pharma: getVal('feature_show_pharma', 'true') === 'true',
      rashan_base_fee: getNum('rashan_base_fee', 750),
      rashan_surcharge_medium: getNum('rashan_surcharge_medium', 200),
      rashan_surcharge_heavy: getNum('rashan_surcharge_heavy', 450),
      rashan_floor_surcharge_low: getNum('rashan_floor_surcharge_low', 150),
      rashan_floor_surcharge_high: getNum('rashan_floor_surcharge_high', 300),
      rashan_placement_fee: getNum('rashan_placement_fee', 150),
      pharma_delivery_base_fee: getNum('pharma_delivery_base_fee', 150),
      pharma_delivery_threshold_km: getNum('pharma_delivery_threshold_km', 0),
      pharma_delivery_per_km_fee: getNum('pharma_delivery_per_km_fee', 20),
      pharma_delivery_max_radius_km: getNum('pharma_delivery_max_radius_km', 15),
      pharma_skip_prescription_verification: getVal('pharma_skip_prescription_verification', 'false') === 'true',
      feature_pharma_lab_tests_enabled: getVal('feature_pharma_lab_tests_enabled', 'false') === 'true',
      feature_pharma_doctor_consultations_enabled: getVal('feature_pharma_doctor_consultations_enabled', 'false') === 'true',
      feature_pharma_reminders_enabled: getVal('feature_pharma_reminders_enabled', 'false') === 'true',
      feature_pharma_refills_enabled: getVal('feature_pharma_refills_enabled', 'false') === 'true',
      pharma_conditions: JSON.parse(getVal('pharma_conditions_list', '[]')),
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

  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const val = await this.getByKey(key);
    return val ? val === 'true' : defaultValue;
  }

  async setByKey(key: string, value: string): Promise<Setting> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingsRepository.create({ key, value });
    }
    const saved = await this.settingsRepository.save(setting);
    
    // Trigger real-time update
    this.settingsGateway.emitSettingsUpdate();
    
    return saved;
  }
}
