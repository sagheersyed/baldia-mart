-- Migration: Add location fields to brands table
-- Run this if the columns are missing from the database
-- NestJS TypeORM should auto-sync with synchronize:true, but run this manually if not

ALTER TABLE brands ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "latitude" NUMERIC(10, 6);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "longitude" NUMERIC(10, 6);

-- Update existing mart brands to have section explicitly set
UPDATE brands SET section = 'mart' WHERE section IS NULL OR section = '';

-- Verify
SELECT id, name, section, location, latitude, longitude FROM brands LIMIT 10;
