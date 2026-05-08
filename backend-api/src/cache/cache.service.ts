import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;
  private readonly patternDeleteBatchSize = 200;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      connectTimeout: 5000,
    });

    this.client.on('connect', () => this.logger.log('✅ Redis connected'));
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));

    this.client.connect().catch((err) =>
      this.logger.warn(`Redis initial connect failed: ${err.message}`),
    );
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  /** Get parsed JSON from cache. Returns null on miss or error. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  /** Store value as JSON with optional TTL (seconds). Default 5 minutes. */
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis set failed for ${key}: ${err.message}`);
    }
  }

  /** Delete one or many keys (supports glob patterns via SCAN). */
  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length) await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis del failed: ${err.message}`);
    }
  }

  /** Delete all keys matching a pattern, e.g. "products:*" */
  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          this.patternDeleteBatchSize,
        );
        cursor = nextCursor;

        if (keys.length) {
          await this.client.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      this.logger.debug(`Cache invalidated (${totalDeleted} keys): ${pattern}`);
    } catch (err) {
      this.logger.warn(`Redis delPattern failed for ${pattern}: ${err.message}`);
    }
  }

  /** Expose the raw client if needed (e.g. pub/sub) */
  getClient(): Redis {
    return this.client;
  }

  // --- GEO METHODS FOR HYPERLOCAL ---

  async updateLocation(riderId: string, lat: number, lng: number): Promise<void> {
    try {
      await this.client.geoadd('rider_locations', lng, lat, riderId);
    } catch (err) {
      this.logger.warn(`GEOADD failed for rider ${riderId}: ${err.message}`);
    }
  }

  async getNearbyRiders(lat: number, lng: number, radiusKm: number): Promise<string[]> {
    try {
      // Using ioredis georadius (search by radius)
      return await this.client.georadius('rider_locations', lng, lat, radiusKm, 'km') as string[];
    } catch (err) {
      this.logger.warn(`GEORADIUS failed: ${err.message}`);
      return [];
    }
  }

  async getRiderLocation(riderId: string): Promise<{ lat: number, lng: number } | null> {
    try {
      const pos = await this.client.geopos('rider_locations', riderId);
      if (!pos || !pos[0]) return null;
      return { lng: parseFloat(pos[0][0]), lat: parseFloat(pos[0][1]) };
    } catch {
      return null;
    }
  }
}
