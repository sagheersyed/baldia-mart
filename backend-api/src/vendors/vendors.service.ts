import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './vendor.entity';
import { VendorProduct } from './vendor-product.entity';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private vendorsRepository: Repository<Vendor>,
    @InjectRepository(VendorProduct) private vendorProductsRepository: Repository<VendorProduct>,
  ) {}

  // ── Haversine Distance (km) ────────────────────────────────────────────────
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Find the Best Vendor for a Single Product ──────────────────────────────
  // Returns nearest open vendor with stock, with automatic fallback chain
  async findBestVendorForProduct(
    productId: string,
    userLat: number,
    userLng: number,
  ): Promise<VendorProduct | null> {
    const candidates = await this.vendorProductsRepository.find({
      where: { productId, isAvailable: true },
      relations: ['vendor', 'product', 'product.brand', 'product.category'],
    });

    // Filter to open + active vendors with stock
    const available = candidates.filter(vp => {
      const v = vp.vendor;
      const p = vp.product;
      const b = p?.brand;
      const c = p?.category;

      if (!v.isOpen || !v.isActive || vp.stockQty <= 0) return false;
      
      // Strict Hierarchical Business Hour Check (Vendor -> Category -> Brand -> Product)
      if (!this.isBusinessOpen(v.openingTime, v.closingTime)) return false;
      if (c && !this.isBusinessOpen(c.openingTime, c.closingTime)) return false;
      if (b && !this.isBusinessOpen(b.openingTime, b.closingTime)) return false;
      if (p && !this.isBusinessOpen(p.openingTime, p.closingTime)) return false;
      
      return true;
    });

    if (available.length === 0) return null;

    // Sort by distance from user address
    available.sort((a, b) => {
      const distA = this.haversine(userLat, userLng, Number(a.vendor.lat), Number(a.vendor.lng));
      const distB = this.haversine(userLat, userLng, Number(b.vendor.lat), Number(b.vendor.lng));
      return distA - distB;
    });

    return available[0];
  }

  private isBusinessOpen(openingTime: string | null, closingTime: string | null): boolean {
    if (!openingTime || !closingTime) return true;
    try {
      const now = new Date();
      const [openH, openM] = openingTime.split(':').map(Number);
      const [closeH, closeM] = closingTime.split(':').map(Number);
      const openTime = new Date(now); openTime.setHours(openH, openM, 0, 0);
      const closeTime = new Date(now); closeTime.setHours(closeH, closeM, 0, 0);
      if (closeTime < openTime) {
        return now >= openTime || now <= closeTime;
      }
      return now >= openTime && now <= closeTime;
    } catch (e) {
      return true;
    }
  }

  // ── Optimize Pickup Sequence (Nearest-First Greedy) ────────────────────────
  optimizePickupSequence(
    vendorCoords: Array<{ vendorId: string; lat: number; lng: number }>,
    startLat: number,
    startLng: number,
  ): Array<{ vendorId: string; sequence: number }> {
    let remaining = [...vendorCoords];
    let currentLat = startLat;
    let currentLng = startLng;
    const result: Array<{ vendorId: string; sequence: number }> = [];
    let seq = 1;

    while (remaining.length > 0) {
      let nearest = remaining[0];
      let minDist = this.haversine(currentLat, currentLng, nearest.lat, nearest.lng);

      for (const v of remaining) {
        const d = this.haversine(currentLat, currentLng, v.lat, v.lng);
        if (d < minDist) {
          minDist = d;
          nearest = v;
        }
      }

      result.push({ vendorId: nearest.vendorId, sequence: seq++ });
      currentLat = nearest.lat;
      currentLng = nearest.lng;
      remaining = remaining.filter(v => v.vendorId !== nearest.vendorId);
    }

    return result;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async findAll(): Promise<Vendor[]> {
    return this.vendorsRepository.find({
      where: { isActive: true },
      relations: ['vendorProducts', 'vendorProducts.product'],
      order: { averageRating: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorsRepository.findOne({
      where: { id },
      relations: ['vendorProducts', 'vendorProducts.product'],
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async create(dto: Partial<Vendor>): Promise<Vendor> {
    const vendor = this.vendorsRepository.create(dto);
    return this.vendorsRepository.save(vendor);
  }

  async update(id: string, dto: Partial<Vendor>): Promise<Vendor> {
    await this.vendorsRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.vendorsRepository.delete(id);
  }

  // ── Vendor Product Catalog ──────────────────────────────────────────────────
  async getVendorProducts(vendorId: string): Promise<VendorProduct[]> {
    return this.vendorProductsRepository.find({
      where: { vendorId },
      relations: ['product'],
    });
  }

  async addProductToVendor(
    vendorId: string,
    productId: string,
    price: number,
    stockQty: number,
  ): Promise<VendorProduct> {
    const existing = await this.vendorProductsRepository.findOne({
      where: { vendorId, productId },
    });

    if (existing) {
      Object.assign(existing, { price, stockQty, isAvailable: stockQty > 0 });
      return this.vendorProductsRepository.save(existing);
    }

    const vp = this.vendorProductsRepository.create({
      vendorId,
      productId,
      price,
      stockQty,
      isAvailable: stockQty > 0,
    });
    return this.vendorProductsRepository.save(vp);
  }

  async updateVendorProduct(
    vendorId: string,
    productId: string,
    dto: Partial<VendorProduct>,
  ): Promise<VendorProduct> {
    const vp = await this.vendorProductsRepository.findOne({ where: { vendorId, productId } });
    if (!vp) throw new NotFoundException('Vendor product not found');
    Object.assign(vp, dto);
    if (dto.stockQty !== undefined) vp.isAvailable = dto.stockQty > 0;
    return this.vendorProductsRepository.save(vp);
  }

  async decrementStock(vendorProductId: string, qty: number): Promise<void> {
    await this.vendorProductsRepository.decrement({ id: vendorProductId }, 'stockQty', qty);
    // Mark unavailable if stock hits 0
    const vp = await this.vendorProductsRepository.findOne({ where: { id: vendorProductId } });
    if (vp && vp.stockQty <= 0) {
      await this.vendorProductsRepository.update(vendorProductId, { isAvailable: false, stockQty: 0 });
    }
  }
}
