-- ==============================================================================
-- Idempotent script: backfill_item_prices.sql
-- Backfills reference prices from catalog_items to existing users' items
-- ONLY where the current price is NULL, 0, or the placeholder ₦100 (10000 minor)
-- AND the user has not manually set the price (sell_price_source != 'user').
-- ==============================================================================

UPDATE items i
SET sell_price_minor = c.ref_price_minor,
    sell_price_source = 'estimate',
    updated_at = NOW()
FROM catalog_items c
WHERE LOWER(TRIM(i.name)) = LOWER(TRIM(c.name))
  AND (i.sell_price_minor IS NULL OR i.sell_price_minor = 0 OR i.sell_price_minor = 10000)
  AND (i.sell_price_source IS NULL OR i.sell_price_source <> 'user')
  AND c.ref_price_minor IS NOT NULL;
