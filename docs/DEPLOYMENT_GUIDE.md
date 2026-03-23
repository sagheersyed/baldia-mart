# Deployment Guide

The platform is designed to run in isolated Docker containers for high availability. 

## Prerequisites
- Docker Engine >= 20.x
- Docker Compose >= 2.x
- Node.js >= 18 (for compiling mobile apps via Expo)

## 1. Local Development via Docker (Database & APIs)

From the project root folder, navigate to docker directory and start the stack:

```bash
cd docker
docker-compose up -d
```

This will run:
- **PostgreSQL Database** on `localhost:5432` (auto-seeded with `schema.sql`)
- **Redis Cache** on `localhost:6379`
- **NestJS Backend** on `192.168.100.142:3000`
- **Next.js Admin Dashboard** on `localhost:3001`

## 2. Running the Mobile Applications

We recommend using Expo Go for rapid testing.

**User App:**
```bash
cd mobile-user-app
npm install
npx expo start
```
Scan the QR code with your phone.

**Rider App:**
```bash
cd mobile-rider-app
npm install
npx expo start
```

## 3. Environment Variables
Check `.env` inside `backend-api` to supply your realtime Firebase Admin keys, which will activate actual push notifications. You will also need a Stripe publishable and secret key for the `PaymentsModule`.

## 4. Geofencing (Baldia Town - 50km)
The 50km hard limit is managed within `delivery_zones` table. To adjust the operational area:
1. Open Admin Panel (`localhost:3001`) -> Zones.
2. Update the Latitude/Longitude center point.
3. Update the radius from 50.00 to any specified float value. The backend will enforce this immediately using the Haversine geometry formula.
