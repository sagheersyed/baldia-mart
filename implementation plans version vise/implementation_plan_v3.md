# Authentication & Feature Fix Plan

This plan addresses reported issues with MPIN logic, rider registration, and quantity limits.

## Proposed Changes

### 1. Authentication Fixes (Backend & Apps)
- **Phone Normalization**: Implement a utility to normalize phone numbers (strip spaces, ensure `+92` prefix if missing) in both backend [AuthService](file:///d:/mart/baldia-mart/backend-api/src/auth/auth.service.ts#9-250) and mobile [api/api.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/api/api.ts).
- **User App OTP Flow**: Update [OtpScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/OtpScreen.tsx) to check if `userData.hasMpin` is already true before force-navigating to [MpinSetup](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/MpinSetupScreen.tsx#9-149).
- **Rider App Navigation**: Ensure [CompleteProfileScreen](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/CompleteProfileScreen.tsx#7-189) is handled correctly within the auth flow, possibly by providing the token in the route params or setting it in `api` defaults explicitly.

### 2. Feature Verification (Quantity Limits)
- **Double-Check Screens**: Verify that [BrandDetailScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/BrandDetailScreen.tsx#32-160), [SearchScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/SearchScreen.tsx#7-117), and [FoodScreen](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/FoodScreen.tsx#111-274) are passing `maxQuantityPerOrder` to [addToCart](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx#41-70).
- **Admin Persistence**: Re-verify that the Admin Panel correctly displays the saved values after a refresh to rule out persistence issues.

### 3. Rider Approval Flow
- **Clarification**: Confirm if the "admin denied" message is actually the "awaiting approval" screen working as intended, and if not, debug any 403/401 errors during the final registration step.

## Verification Plan
- **Mock Login**: Test with existing and new phone numbers to ensure correct routing (MpinLogin vs MpinSetup).
- **Limit Test**: Set a limit of 2 for a product and try adding 3 to the cart in all relevant screens.
- **Rider Flow**: Register a new rider and verify they land on the "Awaiting Approval" dashboard without errors.
