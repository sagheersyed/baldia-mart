# Implementation Plan v14 — User Feedback Adjustments

## 1. 🌟 Rating Count Formatting
**Request:** Show rating count alongside rating value. If `< 100`, show exactly (e.g., [(5)](file:///d:/mart/baldia-mart/mobile-user-app/App.tsx#206-218)). If `>= 100`, show `100+`, `200+`, `1000+`, etc.

### Mobile App
#### [MODIFY] [utils.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/utils/helpers.ts) (or create helper inline)
- Create `formatRatingCount(count: number): string`
- Logic: `count < 100 ? count.toString() : (Math.floor(count / 100) * 100) + '+'`. Wait, `250` becomes `200+`. `1040` becomes `1000+`.

#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- Use `formatRatingCount` on `resto.ratingCount`.
- Change `⭐ 4.5` to `⭐ 4.5 (${formatRatingCount(resto.ratingCount)})`.

#### [MODIFY] [RestaurantDetailScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/RestaurantDetailScreen.tsx)
- Also update rating display here.

---

## 2. 🔴 Re-add 'Closed' Tag
**Request:** User didn't see explicit open/closed text and wants a clearer tag for closed restaurants.

### Mobile App
#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- For closed `RestaurantCard`s, in addition to dimming, overlay a text element (e.g., a pill that says "Currently Closed") over the image so it is unmistakably clear.

---

## 3. 🛒 Add to Cart for Favourite Products
**Request:** The products tab in My Favourites does not let users add products to their cart.

### Mobile App
#### [MODIFY] [FavouritesScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FavouritesScreen.tsx)
- Import [useCart](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx#130-137).
- For [Products](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/OrderTrackingScreen.tsx#101-114) tab rows, replace simple list rows with an active cart button or use the same `onAdd` approach.
- In [renderItem](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/SearchScreen.tsx#45-78), add a `+ Add` button for products.
