# Architectural Review: BaldiaMart (Mart + Food)

## Problem Statement
The Food/Restaurant functionality was **bolted onto** a Mart-first app, creating architectural debt. This document identifies gaps and provides a corrective roadmap.

---

## Current Architecture Issues

### 1. Data Model Issues
| Entity | Issue | Fix |
|--------|-------|-----|
| `brands` | Used for both Mart brands AND restaurants (same table) | ✅ Added `section` column — but restaurants should ideally have a separate `restaurants` entity |
| `categories` | Used for both Mart and Food categories | ✅ Added `section` column |
| `products` | All products in one table, no restaurant isolation | ⚠️ Need `restaurantId` FK or separate `menu_items` table |
| `orders` | Single order table, no `orderType` for Mart vs Food | ⚠️ Should have `orderType:'mart'|'food'` |
| `banners` | ✅ Has `section` field — correct |

### 2. Mobile App Issues (Resolved This Session)
| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| Brands not showing images | Used `brand.imageUrl` but API returns `brand.logoUrl` | ✅ Fixed in [BrandsScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/BrandsScreen.tsx#62-217) and [HomeScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/HomeScreen.tsx#87-373) |
| Food tab resets to Mart on back | Home/Brands tabs had forced `setActiveMode('mart')` listener | ✅ Removed forced listeners, `backBehavior="history"` now works |
| Admin Panel location fields | Form existed but DB columns were missing | ✅ TypeORM `synchronize:true` adds columns on backend restart |
| Real-time banner updates | Socket.io not integrated on mobile | ✅ Added [io()](file:///d:/mart/baldia-mart/mobile-user-app/App.tsx#129-187) in [HomeScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/HomeScreen.tsx#87-373) and [FoodScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx#109-310) |

### 3. Admin Panel Issues
| Area | Issue | Status |
|------|-------|--------|
| Brands page | Now has Section, Location, Lat, Lng fields | ✅ Fixed |
| Restaurants | No dedicated restaurant management page | ⚠️ Currently uses Brands with `section:'restaurant'` |
| Orders | No view/filter by order type | ⚠️ Future improvement |

---

## Recommended Architecture for Long-Term

```
Food Domain            Mart Domain
─────────────          ─────────────
restaurants            brands
menu_items             products
food_orders            mart_orders
food_banners ─────────────────────────── banners (all)
```

### Short-term (Current): Shared Tables with `section` Column ✅
- `brands.section = 'mart' | 'restaurant'`
- `categories.section = 'mart' | 'restaurant'`
- `banners.section = 'mart' | 'food' | 'all'`

### Long-term: Separate Entities
- Create a `restaurants` table with `location`, `lat`, `lng`, `cuisineType`, `rating`, `openingHours`
- Create a `menuItems` table linked to `restaurantId`
- Separate `foodOrders` from `martOrders`

---

## Current App Module Map

```
backend-api/src/
├── brands/          ← Serves both Mart brands AND restaurants
├── categories/      ← Serves both Mart and Food categories
├── products/        ← Mart products only (food uses brands as restaurants)
├── banners/         ← ✅ Fully section-aware with WebSocket gateway
├── orders/          ← Single order type, should add orderType field
└── settings/        ← Feature flags (show_restaurants, show_brands)
```

---

## Immediate Action Items
1. **Restart Backend** → TypeORM `synchronize:true` will add `location/latitude/longitude` to `brands` table automatically
2. **Admin Panel**: Add/Edit a restaurant brand with `section = 'restaurant'` and location fields — it will now save
3. **Mobile**: Cart context switching and brand images are now fixed — test by opening app fresh
