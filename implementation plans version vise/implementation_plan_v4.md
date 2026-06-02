# Implementation Plan v4 - Resolving Regressions & Environment Sync

The user reports that previously implemented fixes for MPIN navigation, quantity limits, and rider registration have failed or are not present in the applications. 

## Diagnosis
The backend appears to be running an outdated version of the code (since diagnostic file logging failed to trigger). This explains why the mobile apps are not seeing the `hasMpin` flag or the quantity limits.

## User Actions Required
> [!IMPORTANT]
> The backend MUST be restarted to apply the core logic changes. Please run `npm run start:dev` in the `backend-api` directory.
> Also, ensure both mobile apps are restarted with the `--clear` flag (which you are already doing).

## Proposed Changes

### 1. Backend Verification & Fixes
- **Logging**: Keep the [LoggingInterceptor](file:///d:/mart/baldia-mart/backend-api/src/common/logging.interceptor.ts#7-38) with file-logging active to verify incoming requests once the backend is restarted.
- **Payload Inspection**: Manually verify that `GET /products` and `GET /menu-items` return the `maxQuantityPerOrder` field.
- **Rider Activation**: ensure [Rider](file:///d:/mart/baldia-mart/admin-panel/src/app/riders/page.tsx#7-25) entity default `isActive: false` is correctly applied in the database.

### 2. User App Fixes
- **Mpin Navigation**: Double-check [OtpScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/OtpScreen.tsx) to ensure it handles the `hasMpin` flag robustly, adding a fallback if the flag is missing.
- **Quantity Limits**: Ensure [CartContext.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx) fallback for `maxQuantityPerOrder` is `0` (no limit) and handles strings/numbers safely.

### 3. Rider App Fixes
- **Registration Flow**: Ensure the "Awaiting Approval" state is correctly triggered when `isActive` is `false`.
- **MPIN Persistence**: Verify that [signIn](file:///d:/mart/baldia-mart/mobile-user-app/src/context/AuthContext.tsx#61-80)/`loginSuccess` in [AuthContext](file:///d:/mart/baldia-mart/mobile-user-app/src/context/AuthContext.tsx#6-14) correctly persists the user state.

## Verification Plan

### Automated/Scripted Tests
- Run `curl.exe` (or `Invoke-RestMethod`) to verify:
    - `POST /auth/verify-otp` returns `user.hasMpin`.
    - `GET /products` returns `maxQuantityPerOrder` for items.
    - `GET /riders/me` returns `isActive: false` for new riders.

### Manual Verification
- **User App**: Login with a phone that has an MPIN -> Verify it goes to `MpinLogin`.
- **User App**: Login with a phone that has NO MPIN -> Verify it stays on [MpinSetup](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/MpinSetupScreen.tsx#9-149).
- **Rider App**: Register new rider -> Verify dashboard shows "Awaiting Admin Approval".
- **Admin Panel**: Approve the new rider -> Verify rider can now go online.
