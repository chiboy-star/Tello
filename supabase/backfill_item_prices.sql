-- ==============================================================================
-- Idempotent script: backfill_item_prices.sql
-- Resets unverified catalog prices to NULL so shop owners explicitly set prices.
-- To import verified prices with URLs and evidence, use:
--   pnpm exec tsx scripts/import-catalog-prices.ts <path-to-csv>
-- ==============================================================================

-- Reset all non-user prices to NULL so items cleanly display "Set price" in the UI
UPDATE items
SET sell_price_minor = NULL,
    sell_price_source = NULL
WHERE (sell_price_source IS NULL OR sell_price_source <> 'user');

-- Clear speculative reference prices in catalog_items until authentic CSV is imported
UPDATE catalog_items
SET ref_price_minor = NULL,
    ref_price_confidence = 'low',
    ref_price_source = NULL
WHERE ref_price_source IS NULL OR ref_price_source <> 'sourced_audit';
