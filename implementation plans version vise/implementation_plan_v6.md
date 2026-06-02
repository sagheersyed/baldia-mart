# Fix for Product Update Error and Rider Login Issues

This plan addresses the "invalid input syntax for type uuid" error in the Admin Panel and fixes the data loss (MPINs, active status) caused by the previous database normalization script.

## User Review Required

> [!IMPORTANT]
> The database normalization script ([normalize_db_manual.js](file:///d:/mart/baldia-mart/normalize_db_manual.js)) will be updated to preserve MPINs, active status, and profile completeness during account merging. If you have riders who already lost their MPINs, they will need to reset them via OTP or Google Login.

## Proposed Changes

### Admin Panel

#### [MODIFY] [page.tsx](file:///d:/mart/baldia-mart/admin-panel/src/app/products/page.tsx)
- Modify [handleSubmit](file:///d:/mart/baldia-mart/mobile-rider-app/src/screens/CompleteProfileScreen.tsx#79-118) to convert empty strings (`""`) in UUID fields (`brandId`, `categoryId`) to `null` before sending the request. This prevents the Postgres UUID validation error.

### Backend API

#### [MODIFY] [normalize_db_manual.js](file:///d:/mart/baldia-mart/backend-api/normalize_db_manual.js)
- Update the selection query to include `mpin`, `is_active`, and `is_profile_complete`.
- Enhance the merge logic to preserve the `mpin` and `isActive` status if they exist in any of the duplicate records.

#### [MODIFY] [products.service.ts](file:///d:/mart/baldia-mart/backend-api/src/products/products.service.ts) (Optional but Recommended)
- Add a safety check in the update method to handle empty strings for UUID fields if passed from other sources.

## Verification Plan

### Automated Tests
- None at this time (manual verification is more effective for these UI/DB issues).

### Manual Verification
1. **Admin Panel**:
   - Open the Admin Panel and edit a product.
   - Leave the "Brand" field empty (if optional) and save.
   - Verify that the product is saved successfully without the UUID error.
2. **Database Script**:
   - Run the updated [normalize_db_manual.js](file:///d:/mart/baldia-mart/normalize_db_manual.js).
   - Verify in the database that no more duplicate phone numbers exist and that MPINs are preserved for merged accounts.
3. **Rider App**:
   - Test login for a rider who was affected by the merge.
   - Verify they can log in via MPIN or reset it via OTP.
