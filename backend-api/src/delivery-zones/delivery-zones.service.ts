import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZone } from './delivery-zone.entity';

@Injectable()
export class DeliveryZonesService {
  constructor(
    @InjectRepository(DeliveryZone)
    private zonesRepository: Repository<DeliveryZone>,
  ) {}

  async findAllActive(): Promise<DeliveryZone[]> {
    return this.zonesRepository.find({ where: { isActive: true } });
  }

  // Haversine formula
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  async validateAddressInZone(lat: number, lng: number): Promise<{ isValid: boolean, distance: number, zone?: DeliveryZone }> {
    const activeZones = await this.findAllActive();
    
    // For Baldia Town standard setup, we want max 50km
    for (const zone of activeZones) {
      const distance = this.calculateDistance(lat, lng, zone.centerLat, zone.centerLng);
      // Hard cap or DB configured
      if (distance <= zone.radiusKm) {
        return { isValid: true, distance, zone };
      }
    }
    
    return { isValid: false, distance: -1 };
  }
}
