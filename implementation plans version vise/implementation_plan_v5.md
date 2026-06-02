# Implementation Plan v5 - Fixing Duplicates & Cart Functionality

The user is experiencing duplicate rider accounts due to legacy inconsistent phone number formats and an "Add to Cart" failure in the mobile app.

## User Review Required
> [!IMPORTANT]
> This plan involves a database cleanup script that will **merge** duplicate rider accounts. I will prioritize accounts with more data (e.g., higher earnings or completed profiles).

## Proposed Changes

### 1. Database & Backend (Duplicates)
- **Normalize & Merge Script**: Create `normalize_db.ts` to:
    1. Fetch all users/riders.
    2. Normalize their phone numbers using the `+92...` logic.
    3. Detect conflicts (multiple IDs for same normalized phone).
    4. Merge data (keep highest earnings/profile-complete) and delete redundant records.
    5. Update all remaining records to the normalized format.
- **Entity Update**: Add `unique: true` to the `phoneNumber` column in [Rider](file:///d:/mart/baldia-mart/admin-panel/src/app/riders/page.tsx#7-25) entity.

### 2. Mobile User App (Add to Cart)
- **CartContext Debugging**: 
    - Add `console.log` in [addToCart](file:///d:/mart/baldia-mart/mobile-user-app/src/context/CartContext.tsx#41-70) to inspect the incoming `item` and the `maxQuantityPerOrder` check.
    - Ensure [Number(item.maxQuantityPerOrder)](file:///d:/mart/baldia-mart/backend-api/src/users/users.service.ts#17-20) handles null/undefined/string correctly.
    - Fix logic if it's accidentally blocking valid items.

## Verification Plan

### Automated/Scripted Tests
- Run `node normalize_db.ts --dry-run` to see how many merges will happen.
- Run `node normalize_db.ts` to apply changes.
- Verify through `psql` or API that `03150258004` and `+923150258004` are now a single record.

### Manual Verification
- **User App**: Try adding products to cart -> Verify items appear and limits (if set) work.
- **Rider App**: Login with `03150258004` -> Verify it finds the existing "Bashar Syed" account with history.
