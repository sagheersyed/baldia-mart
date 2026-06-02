-- ─────────────────────────────────────────────────────────────────────────
-- Backfill discovery / home flags for existing rows.
-- Safe to run multiple times. Run AFTER the app has booted once with the
-- updated entities (so `synchronize: true` has added the new columns).
--
--   psql "$DATABASE_URL" -f migrations/seed-home-flags.sql
--
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Enable trigram extension for fuzzy / case-insensitive search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram indexes for fast LIKE / ILIKE on product/brand/category names.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON products USING gin (lower(description) gin_trgm_ops)
  WHERE description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON categories USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_brands_name_trgm
  ON brands USING gin (lower(name) gin_trgm_ops);

-- 3. Mark every product that has a positive discount as a deal.
UPDATE products
SET    is_deal = true
WHERE  COALESCE(discount_price, 0) > 0
  AND  is_deal = false;

-- 4. Auto-fill discount_percent when missing but discount_price > 0.
UPDATE products
SET    discount_percent = ROUND(((discount_price / NULLIF(price, 0)) * 100)::numeric)
WHERE  discount_percent IS NULL
  AND  COALESCE(discount_price, 0) > 0
  AND  price > 0;

-- 5. Seed a sane sort_order for categories based on creation order
--    so the Home Screen has a deterministic, controllable order.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY section ORDER BY created_at ASC) AS rn
  FROM   categories
)
UPDATE categories c
SET    sort_order = ordered.rn * 10
FROM   ordered
WHERE  c.id = ordered.id
  AND  c.sort_order = 0;

-- 6. Mark the 10 most-recently-created products per category as best-sellers
--    until soldCount accumulates from real orders.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY category_id ORDER BY created_at DESC
         ) AS rn
  FROM   products
  WHERE  is_active = true
)
UPDATE products p
SET    is_best_seller = true
FROM   ranked
WHERE  p.id = ranked.id
  AND  ranked.rn <= 10
  AND  p.is_best_seller = false;

-- 7. Default sort_order on products (per category) so Home Screen ordering is
--    predictable; admins can override via the products UI later.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
           PARTITION BY category_id ORDER BY created_at DESC
         ) AS rn
  FROM   products
  WHERE  is_active = true
)
UPDATE products p
SET    sort_order = ranked.rn
FROM   ranked
WHERE  p.id = ranked.id
  AND  p.sort_order = 0;

-- 8. Helpful summary for sanity-checking the backfill in psql:
SELECT 'products' AS table_name,
       COUNT(*)                                       AS total_rows,
       COUNT(*) FILTER (WHERE is_featured)            AS featured,
       COUNT(*) FILTER (WHERE is_best_seller)         AS best_sellers,
       COUNT(*) FILTER (WHERE is_deal)                AS deals
FROM   products
UNION ALL
SELECT 'categories'                                   AS table_name,
       COUNT(*)                                       AS total_rows,
       NULL, NULL, NULL
FROM   categories;
