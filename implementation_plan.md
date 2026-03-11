# Goal Description
Build a complete hyperlocal e-commerce delivery system (similar to Baldia Mart) with User App, Rider App, Admin panel, and Backend API, scoped strictly to a max of 50km radius for a specific geo-fenced delivery zone (e.g., Baldia Town). The system uses Expo React Native (User & Rider Apps), Next.js (Admin Panel), NestJS (Backend), and PostgreSQL (Database).

## Proposed Changes
### Project Structure Setup
Initialize a mono-repository or standardized root folder containing:
- `backend-api/`: NestJS backend. We'll utilize TypeORM or Prisma for the PostgreSQL interactions, Redis for caching, and interact with Firebase Admin for push notifications.
- `admin-panel/`: Next.js web application for administrative control (Products, Zones, Zones/Radius settings).
- `mobile-user-app/`: React Native (Expo) app for users placing grocery orders.
- `mobile-rider-app/`: React Native (Expo) app for riders.
- `database/`: SQL schemas, seeding configurations.
- `docker/`: Dockerfiles and `docker-compose.yml` for unified development / deployment.
- `docs/`: System documentation.

### Database Architecture
We will design tables for:
- `users`: Standard user data.
- `addresses`: User requested and saved geolocations with lat/lng.
- `delivery_zones`: Configured operational areas with center lat/lng and max radius in km.
- `categories`, `products`: Catalog items, pricing, inventory/stock count.
- `cart`, `cart_items`: User carts.
- `orders`, `order_items`: Placed order receipts.
- `payments`: Transcation logs.
- `reviews`: Product and/or delivery ratings.
- `riders`: Delivery personnel data, current lat/lng, and status.
- `coupons`: Discounts configurations.
- `notifications`: Push notification history.

### Delivery Zone Validation logic
We will use the Haversine formula on the backend to validate incoming checkout requests based on selected user addresses to determine if they are `<= 50km` from any active `delivery_zone`.

### Security & Deployment
Implement Firebase authentication bridged with JWT. All apps will be heavily reliant on Docker for isolated runtime environments. 

## Verification Plan
1. **API Endpoints Testing:** Manually verify creation of zones, orders out of the 50km radius vs within bounds (API integration testing).
2. **Component Integration:** Run the Dockerized backend, launch the Next.js admin frontend, and use Expo Go/React Native tools to spin up to test the User App and Rider App UI flows securely.
