import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * TypeORM CLI data source for generating and running migrations.
 * Usage:
 *   npx typeorm migration:generate src/migrations/PharmaInit -d src/config/typeorm-migration.config.ts
 *   npx typeorm migration:run -d src/config/typeorm-migration.config.ts
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'baldia_mart',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
