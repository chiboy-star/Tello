-- Auto-generated idempotent catalog price import

-- Generated at: 2026-11-23T09:41:40.021Z



UPDATE catalog_items
SET
  ref_price_minor = 25000,
  ref_price_confidence = 'medium',
  ref_price_source = 'sourced_audit',
  ref_price_accessed_at = '2026-11-23'
WHERE lower(name) = lower('Test Item 1');

UPDATE catalog_items
SET
  ref_price_minor = 40000,
  ref_price_confidence = 'high',
  ref_price_source = 'sourced_audit',
  ref_price_accessed_at = '2026-11-23'
WHERE lower(name) = lower('Test Item 2');