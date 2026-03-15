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

  async findAll(): Promise<DeliveryZone[]> {
    return this.zonesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findAllActive(): Promise<DeliveryZone[]> {
    return this.zonesRepository.find({ where: { isActive: true } });
  }

  async create(zoneData: Partial<DeliveryZone>): Promise<DeliveryZone> {
    const zone = this.zonesRepository.create(zoneData);
    return this.zonesRepository.save(zone);
  }

  async update(id: string, updateData: Partial<DeliveryZone>): Promise<DeliveryZone> {
    await this.zonesRepository.update(id, updateData);
    return this.zonesRepository.findOne({ where: { id } }) as Promise<DeliveryZone>;
  }

  async toggleActive(id: string): Promise<DeliveryZone> {
    const zone = await this.zonesRepository.findOne({ where: { id } });
    if (!zone) throw new Error('Zone not found');
    zone.isActive = !zone.isActive;
    return this.zonesRepository.save(zone);
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
    
    console.log(`Validating coordinates (${lat}, ${lng}) against ${activeZones.length} active zones`);

    if (activeZones.length === 0) {
      console.warn('NO ACTIVE DELIVERY ZONES FOUND IN DATABASE');
    }

    // For Baldia Town standard setup, we want max 50km
    for (const zone of activeZones) {
      const distance = this.calculateDistance(lat, lng, Number(zone.centerLat), Number(zone.centerLng));
      console.log(`Zone "${zone.name}": Distance to center is ${distance.toFixed(2)}km (Radius: ${zone.radiusKm}km)`);
      
      if (distance <= Number(zone.radiusKm)) {
        return { isValid: true, distance, zone };
      }
    }
    
    return { isValid: false, distance: -1 };
  }
}
