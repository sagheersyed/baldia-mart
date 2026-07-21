import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * When running migrations from the host machine, PostgreSQL often only allows
 * localhost — not the LAN IP in DB_HOST. Set MIGRATION_DB_HOST=localhost to override.
 */
const resolveMigrationHost = (): string => {
  if (process.env.MIGRATION_DB_HOST) return process.env.MIGRATION_DB_HOST;
  const host = process.env.DB_HOST || 'localhost';
  // Inside Docker, host.docker.internal reaches the host PG — keep as-is.
  if (process.env.RUNNING_IN_DOCKER === '1') return host;
  if (host === 'host.docker.internal' || host === '192.168.100.142') {
    return 'localhost';
  }
  return host;
};

/**
 * TypeORM CLI data source for generating and running migrations.
 * Usage:
 *   npx typeorm migration:generate src/migrations/PharmaInit -d src/config/typeorm-migration.config.ts
 *   npx typeorm migration:run -d src/config/typeorm-migration.config.ts
 */
export default new DataSource({
  type: 'postgres',
  host: resolveMigrationHost(),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'baldia_mart',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
  ssl: false,
});
