# Rider Logistics, Product Limits & Registration Fixes

Addressing technical debt in the rider registration flow while adding requested features for operational control and rider efficiency.

## Proposed Changes

### [Backend] [backend-api]
#### [MODIFY] [riders.controller.ts](file:///d:/mart/baldia-mart/backend-api/src/riders/riders.controller.ts)
- Move `@Patch('me')` above `@Patch(':id')` to resolve route conflict.

#### [MODIFY] [rider.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/riders/rider.entity.ts)
- Change default `isActive` to `false`. Riders now require manual admin approval via the dashboard.

#### [MODIFY] [product.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/products/product.entity.ts) & [menu-item.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/menu-items/menu-item.entity.ts)
- Add `maxQuantityPerOrder` column (default: 0).

#### [MODIFY] [orders.service.ts](file:///d:/mart/baldia-mart/backend-api/src/orders/orders.service.ts)
- Enforce `maxQuantityPerOrder` validation in [placeOrder](file:///d:/mart/baldia-mart/backend-api/src/orders/orders.controller.ts#50-62).

### [Mobile Rider App] [mobile-rider-app]
#### [MODIFY] [DashboardScreen.tsx](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/DashboardScreen.tsx)
- Add an "Awaiting Approval" overlay if `rider.isActive` is false and `rider.isProfileComplete` is true.
- Disable "Go Online" toggle if not active.

#### [MODIFY] [OrderDetailsScreen.tsx](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/OrderDetailsScreen.tsx) & [NavigationScreen.tsx](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/NavigationScreen.tsx)
- Group items by Restaurant header (e.g., "Stop 1: Pizza Hut").

### [Mobile User App] [mobile-user-app]
#### [MODIFY] [CartContext.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx)
- Add validation logic to [addToCart](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx#39-62) and [updateQuantity](file:///d:/mart/baldia-mart/mobile-user-app/src/api/api.ts#88-90) for `maxQuantityPerOrder`.

### [Admin Dashboard] [admin-panel]
#### [MODIFY] [(dashboard)/products/page.tsx] & [(dashboard)/restaurants/[id]/menu/page.tsx]
- Add `maxQuantityPerOrder` input field to product and dish forms.

#### [MODIFY] [(dashboard)/riders/page.tsx]
- Add "Approve" button to Rider list that toggles `isActive` status.

## Verification Plan

### Automated Tests
- Test rider login: Verify `isActive=false` riders are blocked from accepting orders.
- verify [placeOrder](file:///d:/mart/baldia-mart/backend-api/src/orders/orders.controller.ts#50-62) rejects if an item quantity exceeds the limit set in the DB.

### Manual Verification
- **Admin**: Approve a rider and verify they can immediately go online.
- **Admin**: Set a limit of 2 for "Tomato" and verify the user app blocks adding a 3rd.
- **Rider**: View a batched order and verify the list is grouped by restaurant name.
