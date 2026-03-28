# Implementation Plan - Final Fix for Cart Mode Jerking

This plan resolves the "jerking" effect on the Cart screen by centralizing the `mode` state in [CartContext](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx#16-33) and removing redundant navigation parameters.

## Proposed Changes

### [Mobile App]

#### [MODIFY] [CartScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/CartScreen.tsx)
- Rely solely on `activeMode` from [useCart()](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx#130-137).
- Remove `route.params.mode` usage and the `useFocusEffect` that syncs from it.

#### [MODIFY] [HomeScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/HomeScreen.tsx)
- Remove `{ mode: 'mart' }` from `navigation.navigate('Cart')`.

#### [MODIFY] [FoodScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx)
- Remove `{ mode: 'food' }` from `navigation.navigate('Cart')`.

#### [MODIFY] [BrandsScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/BrandsScreen.tsx)
- Remove `{ mode: 'mart' }` from `navigation.navigate('Cart')`.

#### [MODIFY] [BrandDetailScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/BrandDetailScreen.tsx)
- Remove `{ mode: 'mart' }` from `navigation.navigate('Cart')`.

#### [MODIFY] [RestaurantDetailScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/RestaurantDetailScreen.tsx)
- Remove `{ mode: 'food' }` from `navigation.navigate('Cart')`.

## Verification Plan

### Manual Verification
1. Open Mart Home -> Click Header Cart -> Verify Mart Cart shows immediately (no jerk).
2. Go to Food Tab -> Click Header Cart -> Verify Food Cart shows immediately (no jerk).
3. Go back to Mart Home -> Click Bottom Cart Tab -> Verify Mart Cart shows correctly.
4. Go to a Brand Detail page -> Click Header Cart -> Verify Mart Cart shows correctly.
