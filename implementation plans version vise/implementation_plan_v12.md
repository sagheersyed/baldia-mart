# Implementation Plan v12 — Ratings Fix, Favourites & About App

## Overview
Three distinct features:
1. **Fix Ratings** — Ratings submitted for restaurants and brands are stored but never update the entity's `rating` column. Need to recalculate and persist average ratings after each review.
2. **Favourites** — Let customers mark restaurants and products as favourites, persisted locally using `AsyncStorage`.
3. **About App** — A dedicated screen with app info, version, team, and links.

---

## 1. Fix Ratings

### Root Cause
`BusinessReviewsService.create()` saves the review but never updates `Restaurant.rating` or `Brand.rating`. The [Brand](file:///d:/mart/baldia-mart/backend-api/src/brands/brand.entity.ts#4-45) entity also has **no `rating` column** at all.

### Backend Changes

#### [MODIFY] [business-review.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/common/business-review.entity.ts)
- No changes needed.

#### [MODIFY] [brand.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/brands/brand.entity.ts)
- Add `rating` column (`numeric`, precision 3, scale 2, default 0).
- Add `ratingCount` column (`int`, default 0).

#### [MODIFY] [restaurant.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/restaurants/restaurant.entity.ts)
- Add `ratingCount` column (`int`, default 0) alongside existing `rating`.

#### [MODIFY] [reviews.module.ts](file:///d:/mart/baldia-mart/backend-api/src/reviews/reviews.module.ts)
- Import [Restaurant](file:///d:/mart/baldia-mart/backend-api/src/restaurants/restaurant.entity.ts#4-54) and [Brand](file:///d:/mart/baldia-mart/backend-api/src/brands/brand.entity.ts#4-45) repositories.

#### [MODIFY] [business-reviews.service.ts](file:///d:/mart/baldia-mart/backend-api/src/reviews/business-reviews.service.ts)
- Inject `RestaurantRepository` and `BrandRepository`.
- After saving a review, query all reviews for that `restaurantId`/`brandId`, calculate the new average, and `save()` back to the entity.

---

## 2. Favourites (Client-side, AsyncStorage)

No backend changes needed — favourites are stored on-device.

### Mobile App Changes

#### [NEW] [FavouritesScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FavouritesScreen.tsx)
- Two tabs: **Restaurants** and **Products**.
- Loads favourites from `AsyncStorage` (`@favRestaurants`, `@favProducts`).
- Renders cards for each. Tapping navigates to the detail screen.
- Empty state if no favourites.

#### [NEW] [useFavourites.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/hooks/useFavourites.ts)
- Custom hook: `isFavourite(id)`, `toggleFavourite(item, type)`.
- Persists to `AsyncStorage`.

#### [MODIFY] [RestaurantDetailScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/RestaurantDetailScreen.tsx)
- Add a ❤️ heart button in the header using `useFavourites`.

#### [MODIFY] [HomeScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/HomeScreen.tsx)
- Add ❤️ heart icon on each product card to toggle favourite using `useFavourites`.

#### [MODIFY] [ProfileScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/ProfileScreen.tsx)
- Update Favourites menu item to navigate to `Favourites` screen (remove "Coming Soon").

#### [MODIFY] [App.tsx](file:///d:/mart/baldia-mart/mobile-user-app/App.tsx)
- Register `FavouritesScreen` as a Stack screen.

---

## 3. About App Screen

#### [NEW] [AboutScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/AboutScreen.tsx)
- App logo, name, version (`1.0.0`).
- Sections: **App Description**, **Features list**, **Contact Us** (email/phone), **Follow Us** (social links as tappable rows).
- **Legal**: Privacy Policy & Terms of Service (as links or modals).
- Consistent styling with platform-native feel.

#### [MODIFY] [ProfileScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/ProfileScreen.tsx)
- Update About App menu item to navigate to `About` screen.

#### [MODIFY] [App.tsx](file:///d:/mart/baldia-mart/mobile-user-app/App.tsx)
- Register `AboutScreen` as a Stack screen.

---

## Review Sections in Admin (Optional — out of scope, skip for now)
The request mentions "separate sections for restaurants, brands, and riders" in ratings. This will be handled in the **Admin Panel** later.

For the **mobile app**, the [OrderTrackingScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/OrderTrackingScreen.tsx#20-706) rating modal already shows each entity separately (Rider first, then each restaurant/brand). No changes needed there.

---

## Verification Plan

### Manual Testing Steps

**Ratings Fix:**
1. Place a food order from a restaurant and get it delivered.
2. Submit a rating for the restaurant (e.g., 5 stars).
3. Open the restaurant card on the Food screen → verify the star rating displayed changed.
4. Repeat for a Mart brand order.

**Favourites:**
1. Open a restaurant detail page → tap ❤️ → confirm it fills red.
2. Go to Profile → Favourites → verify the restaurant appears in the Restaurants tab.
3. Tap on the restaurant in Favourites → verify it navigates to the detail page.
4. Tap ❤️ again → confirm unfavourited → verify removed from Favourites list.
5. On the Home screen → tap ❤️ on a product → verify it appears in the Products tab of Favourites.

**About App:**
1. Go to Profile → About App → verify screen opens with app name, version, and contact info.
