# Implementation Plan v13 — 4 Bug Fixes & Feature Polishes

## 1. 🐛 Fix Business Review Duplicate Key Error

**Root cause:** [business-review.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/common/business-review.entity.ts) line 8 has `@Index(['orderId'], { unique: true })` — one review per order at DB level. Multi-restaurant orders send multiple reviews → duplicate key crash.

### Fix
#### [MODIFY] [business-review.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/common/business-review.entity.ts)
- Remove `@Index(['orderId'], { unique: true })`.
- Add composite index: `@Index(['orderId', 'restaurantId'], { unique: true, where: "restaurant_id IS NOT NULL" })` for restaurant reviews.
- Add composite index: `@Index(['orderId', 'brandId'], { unique: true, where: "brand_id IS NOT NULL" })` for brand reviews.
- TypeORM will auto-migrate (with `synchronize: true`) → **requires Docker rebuild**.

---

## 2. ❤️ Add Product Favourite Buttons

### Mobile App

#### [MODIFY] [HomeScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/HomeScreen.tsx)
- Import [useFavourites](file:///d:/mart/baldia-mart/mobile-user-app/src/hooks/useFavourites.ts#23-75).
- Add a ❤️/🤍 icon overlay on each product card in the featured products section.

---

## 3. 🔴 Closed Restaurant Visual (Dim + Sort, No Badge)

**User feedback:** Showing a visible "Closed" badge is not good UX. Instead:

#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- Add [isRestaurantOpen(openingTime, closingTime)](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/RestaurantDetailScreen.tsx#69-90) helper.
- Sort restaurants: **open ones first** (sorted by rating desc), **closed ones last** (sorted by rating desc).
- For closed restaurants: apply a **semi-transparent dark overlay** + reduced opacity on the card.
- This signals unavailability without cluttering the UI with text badges.

---

## 4. 📞 Dynamic Contact/Social Links for About Screen

### Backend

#### [MODIFY] settings table (via seed / admin panel)
- The `settings` table already uses a key-value pattern. We'll reserve keys:
  - `contact_email`, `contact_phone`
  - `social_facebook`, `social_instagram`
- These are already settable from the admin panel (Settings page).

### Mobile App

#### [MODIFY] [AboutScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/AboutScreen.tsx)
- Fetch `/settings/public` on mount.
- Map `contact_email`, `contact_phone`, `social_facebook`, `social_instagram` keys to the Contact/Social sections dynamically.
- Fall back to placeholder text if keys are not set.

#### [MODIFY] [api.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/api/api.ts)
- `settingsApi.getPublicSettings()` already exists — no new API call needed.
## 5. 🔄 Favourites Live Sync

**Problem:** `AsyncStorage` stores a snapshot of restaurant/product data. If ratings, names, or images change server-side, the Favourites list goes stale.

#### [MODIFY] [FavouritesScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FavouritesScreen.tsx)
- On focus, fetch `/restaurants` and map saved restaurant IDs against fresh server data.
- Update `AsyncStorage` with the refreshed objects.
- Same for products: call `/products` and refresh saved items.
- Show a subtle loading indicator during sync, then display fresh list.

#### [MODIFY] [useFavourites.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/hooks/useFavourites.ts)
- Expose a `syncFromApi(restaurants, products)` function that merges API data into stored favourites.

---


### 1. Reviews Duplicate Fix
- Place a food order from **two different restaurants** in the same session.
- Get order delivered (update status in admin).
- Submit a business review for each restaurant → both should succeed (no 500 error).
- Check Docker logs — should see no duplicate key errors.

### 2. Product Favourites
- On Home screen, tap ❤️ on a product card.
- Go to Profile → Favourites → Products tab → verify it appears.
- Tap ❤️ again → verify removed.

### 3. Open/Closed Badge
- View the Food screen. Restaurants should show green "Open" or red "Closed" badge.
- If restaurant's `openingTime`/`closingTime` is not set, badge is hidden.
- Open restaurants should appear above closed ones.

### 4. Dynamic About Settings
- In Admin Panel → Settings, set `contact_email` to a value.
- Open About App screen in mobile app → verify the new email is shown.
