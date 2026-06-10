# CMS v2 — Full-Featured Merchant Store Management

Complete overhaul of the mobile CMS to make it a production-grade store management system. Covers all three verticals (Grocery, Restaurant, Pharmacy) with proper add/edit/hide flows, change request history, and a CMS authentication gate.

## User Review Required

> [!IMPORTANT]
> **CMS Authentication Gate**: When a merchant taps "Open CMS" on the Profile screen, we will prompt them to re-enter their 4-digit MPIN before granting access. This prevents unauthorized access if someone borrows the merchant's phone. Is MPIN re-verification the approach you want, or would you prefer a separate CMS password?

> [!IMPORTANT]
> **Add New Product/Dish/Medicine — Two Flows**:
> 1. **"Add from Master Catalog"** — Merchant browses the existing master catalog (all products/medicines already in the system) and adds them to their store with custom price/stock. This goes through the Change Request system for admin approval.
> 2. **"Request New Item"** — Merchant fills out a full form (name, description, image, price, etc.) to request a brand-new item that doesn't exist in the master catalog. This also goes through CR approval.
>
> Both flows are included in this plan. Confirm if this is what you want.

## Open Questions

> [!WARNING]
> **Restaurant "Add from Catalog"**: Restaurants currently have their own `menu_items` table (not a master catalog like Products or Medicines). So for restaurants, "Add New Dish" will be the full form approach only (name, description, image, price, category, prep time). There's no separate master catalog to browse from. Is that correct?

---

## Proposed Changes

### Component 1: Backend — Approval Rules Seeding

Fix the root cause of availability toggles and stock updates getting stuck as `submitted` instead of being auto-approved and published.

#### [MODIFY] [seed_all_approval_rules.js](file:///d:/mart/baldia-mart/backend-api/scratch/seed_all_approval_rules.js)
- Seed **8 auto-approval rules** covering all three verticals:
  - `VendorProduct.price` → percentage_change (10%)
  - `VendorProduct.stockQty` → always_approve
  - `VendorProduct.isAvailable` → always_approve
  - `MenuItem.price` → percentage_change (10%)
  - `MenuItem.isAvailable` → always_approve
  - `PharmacyMedicine.priceOverride` → percentage_change (10%)
  - `PharmacyMedicine.stockQuantity` → always_approve
  - `PharmacyMedicine.isActive` → always_approve

---

### Component 2: Backend — New API Endpoints

Add endpoints the mobile app needs to browse master catalogs and add new items.

#### [MODIFY] [vendor-cms.controller.ts](file:///d:/mart/baldia-mart/backend-api/src/cms/controllers/vendor-cms.controller.ts)
- **`GET /cms/vendor/catalog`** — List ALL products in the master `products` table (paginated, searchable) so the merchant can browse items not yet in their store.
- **`POST /cms/vendor/products/add-from-catalog`** — Add an existing master product to the vendor's store (creates a `VendorProduct` via Change Request).

#### [MODIFY] [restaurant-cms.controller.ts](file:///d:/mart/baldia-mart/backend-api/src/cms/controllers/restaurant-cms.controller.ts)
- **`POST /cms/restaurant/menu-items/new`** — Already exists. Confirm the endpoint accepts image upload path correctly.

#### [MODIFY] [pharmacy-cms.controller.ts](file:///d:/mart/baldia-mart/backend-api/src/cms/controllers/pharmacy-cms.controller.ts)
- **`GET /cms/pharmacy/catalog`** — List ALL medicines in the master `medicines` table (paginated, searchable) so the pharmacist can browse medicines not yet stocked.
- **`POST /cms/pharmacy/medicines/add-from-catalog`** — Add a master medicine to the pharmacy's inventory via CR.
- **`PUT /cms/pharmacy/medicines/:pmId/availability`** — New endpoint to toggle `isActive` (availability) for pharmacy medicines, currently missing.

#### [MODIFY] [cms.module.ts](file:///d:/mart/baldia-mart/backend-api/src/cms/cms.module.ts)
- Import `Product` and `Medicine` entities into the CMS module so the new catalog endpoints can query them.

---

### Component 3: Mobile — API Client Updates

#### [MODIFY] [api.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/api/api.ts)
Add new `cmsApi` methods:
- `getVendorMasterCatalog(tenantId, search, page)` — browse products not yet in vendor's store
- `addProductFromCatalog(tenantId, productId, price, stockQty)` — add from master catalog
- `requestNewMenuItem(tenantId, data)` — add new dish (restaurant)
- `getPharmacyMasterCatalog(tenantId, search, page)` — browse medicines not yet in pharmacy
- `addMedicineFromCatalog(tenantId, medicineId, stock, priceOverride)` — add medicine from catalog
- `togglePharmacyAvailability(tenantId, pmId, isActive)` — toggle pharmacy medicine active state
- `verifyMpin(mpin)` — re-verify MPIN for CMS auth gate

---

### Component 4: Mobile — CMS Auth Gate Screen

New screen that prompts MPIN re-entry before granting CMS access.

#### [NEW] [CmsAuthGateScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/CmsAuthGateScreen.tsx)
- Premium UI matching the existing CMS aesthetic
- 4-digit MPIN input with auto-submit
- Biometric option (FaceID/Fingerprint) as secondary auth if available
- On success → navigate to `MerchantDashboard`
- On 3 failed attempts → lock out for 30 seconds
- Store a session flag (`@cms_auth_timestamp`) so re-auth is only required every 15 minutes

#### [MODIFY] [cmsStore.ts](file:///d:/mart/baldia-mart/mobile-user-app/src/store/cmsStore.ts)
- Add `cmsAuthenticatedAt: number | null` to track when CMS was last authenticated
- Add `isCmsSessionValid(): boolean` — checks if auth happened within the last 15 minutes
- Add `setCmsAuthenticated()` — sets the timestamp

---

### Component 5: Mobile — "Add Item" Flow (3 New Screens)

#### [NEW] [AddItemScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/AddItemScreen.tsx)
**"Add from Master Catalog"** screen for Grocery vendors and Pharmacy stores:
- Search bar to search the master product/medicine catalog
- FlatList showing items **not yet in this merchant's store**
- Each item shows name, image, category, master price
- Tap → opens a bottom sheet to set custom price + stock qty
- Submit → creates a CR via `addProductFromCatalog` / `addMedicineFromCatalog`
- Success state shows CR status (auto-approved or submitted for review)

#### [NEW] [AddNewItemFormScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/AddNewItemFormScreen.tsx)
**"Request Brand New Item"** form screen (works for all 3 verticals):
- **Restaurant**: name, description, price, category (dropdown), image (camera/gallery), prep time
- **Grocery**: name, description, price, category, brand, weight/unit, image
- **Pharmacy**: medicine name, generic name, dosage form, strength, pack size, price, stock
- Image picker using `expo-image-picker` → uploads via `uploadApi.uploadFile()`
- Form validation with real-time error messages
- Submit → CR created with actionType `CREATE`
- Uses the existing premium CMS UI theme (cards, gradients, status indicators)

#### [MODIFY] [MerchantDashboardScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/MerchantDashboardScreen.tsx)
- Add new Quick Action card: **"Add Item"** with `add-circle-outline` icon
- Add pharmacy products loading to the dashboard (currently only loads grocery/restaurant)
- Show "Add from Catalog" and "Add New Item" options in a bottom sheet when "Add Item" is tapped

#### [MODIFY] [ProductCatalogScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/ProductCatalogScreen.tsx)
- Add **FAB (Floating Action Button)** "+" at the bottom right → navigates to `AddItem` screen
- Enable availability toggle for pharmacy items (using the new `togglePharmacyAvailability` endpoint)
- Fix the empty state to show a CTA to add items when the catalog is empty

---

### Component 6: Mobile — Fix Change Request History

#### [MODIFY] [ChangeRequestQueueScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/ChangeRequestQueueScreen.tsx)
- Fix the data extraction: the API returns `{ data: [...], total: N }` but the screen might be reading the wrong key
- Add `auto_approved` and `published` status tabs so merchants can see completed CRs
- Show entity name (product/dish/medicine name) alongside CR type for better readability
- Add pull-to-refresh

#### [MODIFY] [ChangeRequestDetailScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/cms/ChangeRequestDetailScreen.tsx)
- Fix data loading if the detail endpoint path is incorrect
- Show the status timeline correctly for `auto_approved` → `published` flow

---

### Component 7: Mobile — Navigation Registration

#### [MODIFY] [App.tsx](file:///d:/mart/baldia-mart/mobile-user-app/App.tsx)
- Import and register new screens: `CmsAuthGateScreen`, `AddItemScreen`, `AddNewItemFormScreen`
- Update `ProfileScreen` → CMS flow to go through `CmsAuthGateScreen` first

---

## Verification Plan

### Automated Tests
1. Run `node scratch/seed_all_approval_rules.js` → verify 8 rules seeded
2. Run `node scratch/check_crs.js` → verify existing stuck CRs
3. Start backend, test these endpoints with curl:
   - `GET /cms/vendor/catalog` returns products
   - `GET /cms/pharmacy/catalog` returns medicines
   - `PUT /cms/pharmacy/medicines/:id/availability` works
4. Metro bundler compiles without errors

### Manual Verification (On Device)
1. Login as **Bismillah Milk Shop** (`+923000000001`, MPIN `1234`)
   - Profile → Open CMS → MPIN re-verification gate → Dashboard
   - Products list → Toggle availability → verify it auto-approves and publishes
   - Add Item → Browse master catalog → Add a product → verify CR created
   - Change Requests → verify history shows all CRs with correct statuses
2. Login as **Iqbal Nihari** (`+923000000101`, MPIN `1234`)
   - Dashboard → Add New Dish form → fill details → submit
3. Login as **Baldia Town Pharmacy** (`+923000000201`, MPIN `1234`)
   - Dashboard → Medicine list loads correctly
   - Add from master catalog → Add medicine → verify CR
   - Toggle availability → verify it works
