# BaldiaMart — Home & Product Discovery API

This doc covers the new endpoints introduced for the redesigned mobile Home Screen and the universal product listing / search experience. All examples use the default API prefix `http://localhost:3000/api/v1`. Replace `$BASE` with your actual host.

```bash
BASE="http://localhost:3000/api/v1"
TOKEN="<paste user JWT here>"
ADMIN_TOKEN="<paste admin JWT here>"
```

---

## 1. `GET /home` — Aggregated home payload

A single, cache-friendly call that returns everything the Home Screen needs: banners, categories, brands, dynamic sections (deals, best-sellers, top categories, recently added, budget picks).

**Query params**

| param   | type   | required | description                                    |
| ------- | ------ | -------- | ---------------------------------------------- |
| section | string | optional | `mart` (default) or `food`                     |
| zoneId  | uuid   | optional | Delivery zone for banner targeting             |
| lat     | number | optional | (Reserved) device latitude                     |
| lng     | number | optional | (Reserved) device longitude                    |

**Cache**: results are cached in Redis under `home:<section>:zone:<zoneId|all>` for 120 seconds. Cache is auto-invalidated on product, banner and category changes.

```bash
# Default (mart, no zone)
curl -s "$BASE/home?section=mart" | jq

# With zone
curl -s "$BASE/home?section=mart&zoneId=00000000-0000-0000-0000-000000000000" | jq
```

**Response shape (truncated)**

```json
{
  "address": null,
  "banners": [ /* Banner[] */ ],
  "categories": [ /* top-level Category[] */ ],
  "brands": [ /* Brand[] up to 12 */ ],
  "rashanEnabled": true,
  "trending": ["Milk", "Eggs", "Atta", "..."] ,
  "sections": [
    {
      "id": "flash-sale",
      "title": "Flash Sale",
      "subtitle": "Limited time deals",
      "type": "deals",
      "layout": "horizontal",
      "viewAll": { "type": "deals" },
      "products": [ /* up to 10 products */ ]
    },
    {
      "id": "best-sellers",
      "title": "Best Sellers",
      "type": "best_sellers",
      "layout": "grid-2",
      "viewAll": { "type": "best_sellers" },
      "products": [ /* ... */ ]
    },
    {
      "id": "category-<uuid>",
      "title": "Daily Essentials",
      "type": "category",
      "categoryId": "<uuid>",
      "layout": "horizontal",
      "viewAll": { "type": "category", "id": "<uuid>" },
      "products": [ /* ... */ ]
    },
    { "id": "recently-added",  "type": "newest",  "products": [/* ... */] },
    { "id": "budget-picks",    "type": "budget",  "viewAll": { "type": "budget", "maxPrice": 100 }, "products": [/* ... */] }
  ]
}
```

---

## 2. `GET /products` — Universal listing (with filters)

Backwards compatible with old `?page&limit` callers. Adds rich filter and sort capabilities. Returns a uniform paginated envelope.

**Query params**

| param      | type    | description                                                                                  |
| ---------- | ------- | -------------------------------------------------------------------------------------------- |
| page       | int     | 1-based page (default 1)                                                                     |
| limit      | int     | page size (default 20, max 50)                                                               |
| search     | string  | matches name/description/brand/category (uses `pg_trgm` if available)                        |
| categoryId | uuid    | filter by category                                                                           |
| brandId    | uuid    | filter by brand                                                                              |
| sort       | enum    | `newest` \| `price_asc` \| `price_desc` \| `popular` \| `discount` \| `rating`               |
| minPrice   | number  | inclusive                                                                                    |
| maxPrice   | number  | inclusive                                                                                    |
| inStock    | boolean | `true` to only show items with `stockQuantity > 0`                                           |
| featured   | boolean | `true` to only show featured                                                                 |
| deal       | boolean | `true` to only show deals (or items with discount > 0)                                       |
| bestSeller | boolean | `true` to only show best sellers                                                             |

**Response envelope**

```json
{
  "data": [ /* Product[] */ ],
  "total": 137,
  "page": 1,
  "limit": 20,
  "totalPages": 7
}
```

```bash
# Cheap, in-stock items in category, sorted by price asc
curl -s "$BASE/products?categoryId=<cat-uuid>&inStock=true&sort=price_asc&maxPrice=200&page=1&limit=20" | jq

# Deals sorted by biggest discount
curl -s "$BASE/products?deal=true&sort=discount&page=1&limit=20" | jq
```

---

## 3. `GET /products/search?q=...`

Full-text-ish search powered by `pg_trgm` trigram indexes (falls back to `ILIKE`). Popular queries are cached for 60 seconds.

```bash
curl -s "$BASE/products/search?q=milk&page=1&limit=20" | jq
```

---

## 4. Curated listing endpoints

All return the same paginated envelope as `GET /products`.

```bash
curl -s "$BASE/products/featured?page=1&limit=20"      | jq
curl -s "$BASE/products/best-sellers?page=1&limit=20"  | jq
curl -s "$BASE/products/deals?page=1&limit=20"         | jq
curl -s "$BASE/products/newest?page=1&limit=20"        | jq
```

---

## 5. `PATCH /products/:id/flags` — Admin merchandising

Toggle merchandising flags from the admin panel. Protected by `JwtAuthGuard` + `AdminRoleGuard`. Updates `products:*` and `home:*` caches and emits a `productsUpdated` socket event.

**Body** (all fields optional)

| field            | type            | description                |
| ---------------- | --------------- | -------------------------- |
| isFeatured       | boolean         | feature on home            |
| isBestSeller     | boolean         | mark as best seller        |
| isDeal           | boolean         | mark as a deal             |
| sortOrder        | int             | curation sort order        |
| discountPercent  | int (0–100)     | display discount percent   |
| tags             | string[]        | search/filter tags         |
| unit             | string          | `kg`/`g`/`ml`/`L`/`pcs`    |
| weight           | string          | e.g. `500g`, `12 pcs`      |

```bash
# Feature a product
curl -sX PATCH "$BASE/products/<product-uuid>/flags" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isFeatured": true}'

# Promote a deal with computed discount %
curl -sX PATCH "$BASE/products/<product-uuid>/flags" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isDeal": true, "discountPercent": 25, "tags": ["flash","weekend"]}'
```

---

## 6. Category extensions

Standard `POST /categories` and `PUT /categories/:id` now accept new fields:

| field            | type   | description                          |
| ---------------- | ------ | ------------------------------------ |
| iconUrl          | string | small icon for home grid             |
| parentCategoryId | uuid   | enables nested subcategory navigation |
| sortOrder        | int    | drives `GET /home` ordering           |

```bash
curl -sX POST "$BASE/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Essentials",
    "section": "mart",
    "iconUrl": "https://cdn.example.com/icons/daily.png",
    "imageUrl": "https://cdn.example.com/banners/daily.jpg",
    "sortOrder": 1
  }'
```

---

## 7. Real-time events

Socket events relevant to the home/listing experience:

| event             | payload                                                     | when                                |
| ----------------- | ----------------------------------------------------------- | ----------------------------------- |
| `productsUpdated` | `{ event: 'stock_updated', productId, stock }` or `{ }`     | stock changes / flags toggle / CRUD |
| `bannersUpdated`  | `{ }`                                                       | banner CRUD                         |

The mobile Home Screen subscribes to both and patches the in-memory payload surgically (or refetches if a structural change is detected). The TTL on the home cache (120s) means the next `GET /home` after invalidation will recompute.

---

## 8. Backfill / migration script

Run once after deploying the new schema (Postgres):

```bash
psql "$DATABASE_URL" -f backend-api/migrations/seed-home-flags.sql
```

This will:

- Enable the `pg_trgm` extension (idempotent).
- Create trigram indexes on `products.name`, `products.description`, `categories.name`, `brands.name`.
- Mark any product with `discount_price > 0` as `is_deal = true` and compute `discount_percent`.
- Seed `categories.sort_order` based on `created_at`.
- Mark the 10 most recent active products per category as `is_best_seller = true` (placeholder until `sold_count` accumulates from real orders via the `OrderItemSubscriber`).
- Set `products.sort_order` based on `created_at`.

> Note: development environments use TypeORM `synchronize: true`, so the column additions are applied automatically on app start. The script above is purely for backfilling default merchandising values.

---

## 9. Quick smoke test

```bash
# 1. Home payload (no auth required)
curl -s "$BASE/home?section=mart" | jq '.sections | length'

# 2. Search
curl -s "$BASE/products/search?q=tomato" | jq '.data | length'

# 3. Best sellers
curl -s "$BASE/products/best-sellers?limit=10" | jq '.data | length'

# 4. Toggle a flag (admin)
curl -sX PATCH "$BASE/products/<id>/flags" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isFeatured": true}' | jq

# 5. Confirm cache invalidation -- next /home call should reflect the flag change
curl -s "$BASE/home?section=mart" | jq '.sections[] | select(.type=="featured") // empty'
```
