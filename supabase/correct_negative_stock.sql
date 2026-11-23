-- ==============================================================================
-- Idempotent script: correct_negative_stock.sql
-- Resets negative quantities to 0 and records an adjustment entry in the ledger.
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
  v_batch_id UUID;
BEGIN
  -- Ensure adjustment type is allowed in entries table
  ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_type_check;
  ALTER TABLE entries ADD CONSTRAINT entries_type_check CHECK (type IN ('sale', 'restock', 'debt_payment', 'adjustment'));

  -- Ensure before_qty, after_qty, and reason columns exist
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS reason TEXT;
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS before_qty NUMERIC(12,2);
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS after_qty NUMERIC(12,2);

  -- For each item with negative stock
  FOR r IN
    SELECT id, user_id, name, current_qty
    FROM items
    WHERE current_qty < 0
  LOOP
    v_batch_id := gen_random_uuid();

    -- Record correction adjustment entry in ledger
    INSERT INTO entries (
      user_id,
      type,
      item_id,
      quantity,
      unit_amount_minor,
      total_minor,
      payment_type,
      occurred_at,
      source,
      note,
      reason,
      before_qty,
      after_qty,
      batch_id,
      line_no
    ) VALUES (
      r.user_id,
      'adjustment',
      r.id,
      ABS(r.current_qty),
      0,
      0,
      'cash',
      NOW(),
      'tap',
      'Corrected from negative stock',
      'Counted',
      r.current_qty,
      0,
      v_batch_id,
      0
    );

    -- Set item stock to 0
    UPDATE items
    SET current_qty = 0,
        updated_at = NOW()
    WHERE id = r.id;

    RAISE NOTICE 'Item % (ID: %) corrected from % to 0', r.name, r.id, r.current_qty;
  END LOOP;
END $$;
