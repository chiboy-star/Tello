-- ==============================================================================
-- Idempotent script: backfill_item_prices.sql
-- Strictly backfills ONLY the reference prices backed by verified evidence files.
-- All other items remain NULL (displayed in UI as "Set price").
-- ==============================================================================

-- 1. Reset any speculative/unverified prices to NULL where source is not 'user'
UPDATE items
SET sell_price_minor = NULL,
    sell_price_source = NULL
WHERE (sell_price_source IS NULL OR sell_price_source <> 'user')
  AND LOWER(TRIM(name)) NOT IN (
    'indomie regular chicken',
    'gala sausage roll',
    'bottled water 75cl'
  );

-- 2. Backfill ONLY verified evidence items:
-- Indomie Regular Chicken (70g) -> ₦260 (26000 minor)
UPDATE items
SET sell_price_minor = 26000,
    sell_price_source = 'estimate',
    updated_at = NOW()
WHERE LOWER(TRIM(name)) LIKE '%indomie regular chicken%'
  AND (sell_price_source IS NULL OR sell_price_source <> 'user');

-- Gala Sausage Roll -> ₦150 (15000 minor)
UPDATE items
SET sell_price_minor = 15000,
    sell_price_source = 'estimate',
    updated_at = NOW()
WHERE LOWER(TRIM(name)) LIKE '%gala sausage roll%'
  AND (sell_price_source IS NULL OR sell_price_source <> 'user');

-- Bottled Water 75cl -> ₦350 (35000 minor)
UPDATE items
SET sell_price_minor = 35000,
    sell_price_source = 'estimate',
    updated_at = NOW()
WHERE LOWER(TRIM(name)) LIKE '%bottled water 75cl%'
  AND (sell_price_source IS NULL OR sell_price_source <> 'user');
