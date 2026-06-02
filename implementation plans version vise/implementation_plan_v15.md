# Implementation Plan v15 — Radius Filtering & Favourites Optimization

## 1. 🌍 Backend Setting: Maximum Radius
**Request:** Filter restaurants based on a service radius (e.g. 5km, 20km).
*Currently, we only have `delivery_threshold_km` which acts as a free delivery threshold, not a strict cutoff.*

### Backend
#### [MODIFY] [settings.service.ts](file:///d:/mart/baldia-mart/backend-api/src/settings/settings.service.ts)
- Add `delivery_max_radius_km` directly to [onModuleInit](file:///d:/mart/baldia-mart/backend-api/src/settings/settings.service.ts#13-39) seed variables (default `5` or `10`).
- Expose `delivery_max_radius_km` in the [getPublic()](file:///d:/mart/baldia-mart/backend-api/src/settings/settings.service.ts#48-66) settings response.

---

## 2. 📏 Distance Calculation Utility
### Mobile App
#### [MODIFY] [helpers.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/utils/helpers.ts)
- Export a Haversine formula function: `getDistanceKm(lat1, lon1, lat2, lon2)`.

---

## 3. 🍔 Add Address Context to Food Screen
*The FoodScreen currently fetches all restaurants but lacks the user's selected address to compute distances.*

### Mobile App
#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- Import `addressesApi` and `settingsApi`.
- Add state variables: `address` and `maxRadius`.
- Inside `useFocusEffect`, fetch the user's default address and the public settings `delivery_max_radius_km`.
- In `sortedFilteredRestaurants`, apply a distance check: 
  - If both address and restaurant have `latitude`/`longitude`, compute `getDistanceKm`.
  - Filter out restaurants where `distance > maxRadius`.
- Render an elegant empty state if no restaurants are within range: *"No restaurants are delivering to your location right now."*

---

## 4. 🛒 Address User's Statement: "My favourites products is not sync with mart"
*Note: In Plan 14, I already fully resolved the absence of 'Add to Cart' functionality for favoured products, meaning cart quantities and features are now identical to the Mart screen. This concern was voiced prior to reviewing the Plan 14 execution.*
- **Action:** No code changes needed here. I will instruct the user to refresh their mobile app to see the previously deployed Plan 14 cart fixes that resolve this discrepancy.
