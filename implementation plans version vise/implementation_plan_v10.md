# Implementation Plan - Fix Cart Mode Persistence

This plan addresses the issue where the Cart screen gets stuck in the wrong mode (Mart vs Food) due to sticky navigation parameters.

## Proposed Changes

### [Mobile App]

#### [MODIFY] [CartScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/CartScreen.tsx)
- Import `useFocusEffect` from `@react-navigation/native`.
- Add `useFocusEffect` to sync `activeMode` with `route.params.mode` and then clear the parameter.
- Update the `mode` constant to prioritize the `contextMode` once params are cleared.

## Verification Plan

### Manual Verification
1. Open the app, stay in Mart mode.
2. Click the header cart icon -> Verify Mart cart is shown.
3. Go back to Home, switch to Food mode (click Food tab).
4. Click the header cart icon on Food screen -> Verify Food cart is shown.
5. Click the bottom Cart tab directly -> Verify the correct mode is maintained.
