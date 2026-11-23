-- Backfill User Item Prices from Catalog Reference Prices
-- Idempotent backfill: only updates items that have a catalog_item_id,
-- whose sell_price_source is NOT 'user' (i.e. user has not explicitly chosen a price),
-- and where sell_price_minor is currently null or 0.

UPDATE items i
SET sell_price_minor = ci.ref_price_minor,
    sell_price_source = 'estimate',
    updated_at = now()
FROM catalog_items ci
WHERE i.catalog_item_id = ci.id
  AND (i.sell_price_source is null OR i.sell_price_source != 'user')
  AND (i.sell_price_minor is null OR i.sell_price_minor = 0)
  AND ci.ref_price_minor is not null;
