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

  // GPS drift tolerance — accounts for GPS inaccuracy in dense/indoor areas
  private readonly GPS_DRIFT_BUFFER_KM = 0.5;

  async validateAddressInZone(lat: number, lng: number): Promise<{ isValid: boolean, distance: number, zone?: DeliveryZone, zones?: DeliveryZone[], maxRadius?: number }> {
    const result = await this.validateAddressInAllZones(lat, lng);
    if (!result.isValid || result.zones.length === 0) {
      return { isValid: false, distance: result.minDistance, maxRadius: result.maxRadius };
    }
    // Return first (closest) matching zone for backward compat, but also expose all zones
    const best = result.zones[0];
    return {
      isValid: true,
      distance: result.minDistance,
      zone: best,
      zones: result.zones,
    };
  }

  /**
   * Returns ALL active zones the coordinate falls within, sorted by distance (closest first).
   * Use this when a vendor/pharmacy location may overlap multiple zones.
   */
  async validateAddressInAllZones(lat: number, lng: number): Promise<{
    isValid: boolean;
    zones: DeliveryZone[];
    minDistance: number;
    maxRadius: number;
  }> {
    const activeZones = await this.findAllActive();

    if (activeZones.length === 0) {
      console.warn('NO ACTIVE DELIVERY ZONES FOUND IN DATABASE — all orders will be blocked');
      return { isValid: false, zones: [], minDistance: -1, maxRadius: 0 };
    }

    let maxRadius = 0;
    const matchingZones: Array<{ zone: DeliveryZone; distance: number }> = [];

    for (const zone of activeZones) {
      const effectiveRadius = Number(zone.radiusKm) + this.GPS_DRIFT_BUFFER_KM;
      if (effectiveRadius > maxRadius) maxRadius = effectiveRadius;

      const distance = this.calculateDistance(lat, lng, Number(zone.centerLat), Number(zone.centerLng));

      if (distance <= effectiveRadius) {
        matchingZones.push({ zone, distance });
      }
    }

    // Sort by distance ascending (closest zone first)
    matchingZones.sort((a, b) => a.distance - b.distance);

    const minDistance = matchingZones.length > 0 ? matchingZones[0].distance : -1;

    return {
      isValid: matchingZones.length > 0,
      zones: matchingZones.map(m => m.zone),
      minDistance,
      maxRadius,
    };
  }
}
