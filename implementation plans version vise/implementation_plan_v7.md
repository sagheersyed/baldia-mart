# Implementation Plan: Restaurant Closure & Enhanced Banner Navigation

This plan implements restaurant operating hours (with closure restrictions) and improves the banner management/navigation experience.

## Proposed Changes

### 1. Restaurant Closure Logic

#### [MODIFY] [restaurant.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/restaurants/restaurant.entity.ts)
- Add `openingTime` (string, e.g., '20:00') and `closingTime` (string, e.g., '04:00') columns.
- Ensure these fields are nullable to support existing data.

#### [MODIFY] [page.tsx](file:///d:/mart/baldia-mart/admin-panel/src/app/restaurants/page.tsx)
- Update the restaurant form to include two `type="time"` inputs for Opening and Closing time.
- Update [handleRestaurantSubmit](file:///d:/mart/baldia-mart/admin-panel/src/app/restaurants/page.tsx#76-104) to send these fields to the backend.

#### [MODIFY] [RestaurantDetailScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/RestaurantDetailScreen.tsx)
- Implement `isRestaurantOpen(openingTime, closingTime)` utility.
- Add an " isOpen" state calculated from the restaurant's hours.
- Display a "Restaurant is currently closed" notice if `isOpen` is false.
- Disable the "Add to Cart" button for all menu items if the restaurant is closed.

### 2. Enhanced Banner Navigation

#### [MODIFY] [page.tsx](file:///d:/mart/baldia-mart/admin-panel/src/app/banners/page.tsx)
- Add state to fetch and store available entities (products, restaurants, brands, categories) based on `linkType`.
- Replace the manually typed `linkId` input with a `select` dropdown populated with the fetched entities.
- This provides a much better UX than typing UUIDs manually.

#### [MODIFY] [HomeScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/HomeScreen.tsx)
- Update `BannerCarousel`'s [onPress](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/ProfileScreen.tsx#37-38) to support `restaurant` navigation.
- Ensure `category` navigation works correctly by setting `selectedCatId`.

#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- Update `BannerCarousel`'s [onPress](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/ProfileScreen.tsx#37-38) to support `product`, `brand`, and `category` navigation.

## Verification Plan

### Manual Verification
1. **Restaurant Hours**:
   - Set a restaurant's hours to a past window (e.g., 8AM - 10AM when it's currently 11AM).
   - Open the restaurant in the mobile app.
   - Verify that the "Closed" notice appears and items cannot be added to the cart.
   - Set it to a future/current window (e.g., 8PM - 4AM) and verify it's open.
2. **Banner Redirection**:
   - In the Admin Panel, create a banner and select a specific product from the new dropdown.
   - Click the banner on the Home Screen.
   - Verify it navigates to the specific product/restaurant.
