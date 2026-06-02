# Implementation Plan v16 — Delivery Zone Filtering

## Objective
Shift the restaurant filtering logic from a simple direct `User ↔ Restaurant` distance check to a broader [DeliveryZone](file:///d:/mart/baldia-mart/backend-api/src/delivery-zones/delivery-zone.entity.ts#3-29) check.

## Logic Overview
The backend already has a [DeliveryZone](file:///d:/mart/baldia-mart/backend-api/src/delivery-zones/delivery-zone.entity.ts#3-29) system (with a `centerLat`, `centerLng`, and `radiusKm`). 
Instead of checking if a restaurant is exactly within X km of the user, we will:
1. Find which **Delivery Zone** the customer is currently located in.
2. Check if the **Restaurant** is also located inside that same **Delivery Zone**.
3. If both the customer and the restaurant belong to the same active Delivery Zone, the customer can see and order from that restaurant.

## Proposed Changes

### 1. 🌐 Mobile API Client
#### [MODIFY] [api.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/api/api.ts)
- Add a new endpoint to fetch active Delivery Zones from the backend:
  ```typescript
  export const deliveryZonesApi = {
    getActive: () => api.get('/delivery-zones/active'),
  };
  ```

### 2. 📱 Mobile App (FoodScreen)
#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- Fetch active Delivery Zones `deliveryZonesApi.getActive()` during [loadData()](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/BrandDetailScreen.tsx#48-76).
- Update the `sortedFilteredRestaurants` logic:
  - First, identify which `<DeliveryZone>` the user's `address` falls into (using the existing [getDistanceKm](file:///d:/mart/baldia-mart/mobile-user-app/src/utils/helpers.ts#8-20) helper vs the zone's center & radius).
  - If the user is **not** in any active zone, show an empty state: *"Your location is currently outside our service zones."*
  - If the user **is** in a zone, filter the `restaurants` list to only include restaurants that *also* fall inside that exact same Delivery Zone (using [getDistanceKm(resto.lat, resto.lng, zone.centerLat, zone.centerLng) <= zone.radiusKm](file:///d:/mart/baldia-mart/mobile-user-app/src/utils/helpers.ts#8-20)).

## Clarification Required
Does this correctly match your vision? Meaning two users on opposite sides of the exact same 20km Zone will both see all restaurants within that Zone, rather than only seeing restaurants physically within 5km of their exact house?
