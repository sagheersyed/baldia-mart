# Preparation & ETA Transparency Plan

Refining the logistics system to surface dish-level and restaurant-level preparation times to both customers and riders.

## Proposed Changes

### [Backend] [backend-api]
#### [MODIFY] [orders.service.ts](file:///d:/mart/baldia-mart/backend-api/src/orders/orders.service.ts)
- Update [placeOrder](file:///d:/mart/baldia-mart/backend-api/src/orders/orders.service.ts#32-315) to calculate `SubOrder.estimatedPrepTimeMinutes` as `MAX(item.prepTimeMinutes)`.
- Fallback to restaurant's general prep time if item-level data is missing.

#### [MODIFY] [sub-order.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/orders/sub-order.entity.ts)
- Add `expectedReadyAt` virtual field or calculated column if needed (otherwise calculate on frontend).

### [Mobile User App] [mobile-user-app]
#### [MODIFY] [CartScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/CartScreen.tsx)
- Show "Estimated Prep: X mins" for each restaurant group in the cart.
- Display individual prep times for each dish in the list.

#### [MODIFY] [OrderTrackingScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/OrderTrackingScreen.tsx)
- Add ETA badges to the SubOrder sequence tabs.

### [Mobile Rider App] [mobile-rider-app]
#### [MODIFY] [OrderDetailsScreen.tsx](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/OrderDetailsScreen.tsx)
- Display dish-level preparation times in the items list.
- Show "Time Priority" indicator for the stop with the longest prep time.

## Verification Plan

### Automated Tests
- Place a multi-restaurant order with varied prep times.
- Check `sub_orders` table in DB for correct `estimatedPrepTimeMinutes`.

### Manual Verification
- Verify prep times appear in the Cart grouping headers.
- Verify Rider app shows prep times in the pickup details.
