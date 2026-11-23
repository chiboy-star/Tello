-- Migration: 20261123000000_stock_rules_and_purchases.sql
-- Description: Enforce non-negative stock, atomic row locks, adjustment reasons, purchases in packs, and stock activity log.

-- 1. Extend entries table schema
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_type_check;
ALTER TABLE entries ADD CONSTRAINT entries_type_check CHECK (type IN ('sale', 'restock', 'debt_payment', 'adjustment'));

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS before_qty NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS after_qty NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pack_type TEXT,
  ADD COLUMN IF NOT EXISTS pack_count NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS units_per_pack NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cost_per_pack_minor BIGINT,
  ADD COLUMN IF NOT EXISTS supplier TEXT;

-- 2. Extend items table schema for usual packs and non-negative stock constraint
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS usual_pack_type TEXT,
  ADD COLUMN IF NOT EXISTS usual_units_per_pack NUMERIC(12,2);

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_current_qty_non_negative;
ALTER TABLE items ADD CONSTRAINT items_current_qty_non_negative CHECK (current_qty >= 0);

-- 3. Dedicated Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier TEXT,
  pack_type TEXT NOT NULL DEFAULT 'carton',
  pack_count NUMERIC(12,2) NOT NULL CHECK (pack_count > 0),
  units_per_pack NUMERIC(12,2) NOT NULL CHECK (units_per_pack > 0),
  units_added NUMERIC(12,2) NOT NULL CHECK (units_added > 0),
  cost_per_pack_minor BIGINT NOT NULL CHECK (cost_per_pack_minor >= 0),
  total_cost_minor BIGINT NOT NULL CHECK (total_cost_minor >= 0),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own purchases" ON purchases;
CREATE POLICY "Users own purchases"
  ON purchases FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_purchases_user_item ON purchases(user_id, item_id, created_at DESC);

-- 4. Dedicated Stock Activity Audit Log table
CREATE TABLE IF NOT EXISTS stock_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('adjustment', 'restock', 'sale', 'void')),
  reason TEXT,
  before_qty NUMERIC(12,2) NOT NULL,
  after_qty NUMERIC(12,2) NOT NULL,
  delta NUMERIC(12,2) NOT NULL,
  note TEXT,
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stock_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own stock activity" ON stock_activity;
CREATE POLICY "Users own stock activity"
  ON stock_activity FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stock_activity_user_item ON stock_activity(user_id, item_id, created_at DESC);

-- 5. Update commit_entries RPC with row locks (FOR UPDATE), strict INSUFFICIENT_STOCK guard, and activity logging
CREATE OR REPLACE FUNCTION commit_entries(p_batch_id UUID, p_entries JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_entry JSONB;
  v_idx INT := 0;
  v_item_id UUID;
  v_customer_id UUID;
  v_type TEXT;
  v_qty NUMERIC;
  v_unit_amount BIGINT;
  v_total BIGINT;
  v_payment_type TEXT;
  v_source TEXT;
  v_note TEXT;
  v_reason TEXT;
  v_pack_type TEXT;
  v_pack_count NUMERIC;
  v_units_per_pack NUMERIC;
  v_cost_per_pack BIGINT;
  v_supplier TEXT;
  v_occurred_at TIMESTAMPTZ;
  v_cust_name TEXT;
  v_inserted_rows JSONB := '[]'::JSONB;
  v_already_exists BOOLEAN;
  v_new_entry entries%ROWTYPE;
  v_current_qty NUMERIC;
  v_item_name TEXT;
  v_before NUMERIC;
  v_after NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated' USING errcode = '42501';
  END IF;

  -- Phase 1: Stock Validation with Row-level Lock (FOR UPDATE) to prevent race conditions
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_type := v_entry->>'type';
    v_qty := (v_entry->>'quantity')::NUMERIC;
    v_item_id := (v_entry->>'item_id')::UUID;

    IF v_type = 'sale' AND v_item_id IS NOT NULL THEN
      -- Lock the item row
      SELECT current_qty, name INTO v_current_qty, v_item_name
      FROM items
      WHERE id = v_item_id AND user_id = v_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found: %', v_item_id USING errcode = 'P0002';
      END IF;

      IF v_current_qty < v_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % available for % (requested %)', v_current_qty, v_item_name, v_qty
        USING errcode = '22000';
      END IF;
    END IF;
  END LOOP;

  -- Phase 2: Insert entries and update stock
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_type := v_entry->>'type';
    v_qty := (v_entry->>'quantity')::NUMERIC;
    v_unit_amount := (v_entry->>'unit_amount_minor')::BIGINT;
    v_total := COALESCE((v_entry->>'total_minor')::BIGINT, 0);
    v_payment_type := COALESCE(v_entry->>'payment_type', 'cash');
    v_source := COALESCE(v_entry->>'source', 'tap');
    v_note := v_entry->>'note';
    v_reason := v_entry->>'reason';
    v_pack_type := v_entry->>'pack_type';
    v_pack_count := (v_entry->>'pack_count')::NUMERIC;
    v_units_per_pack := (v_entry->>'units_per_pack')::NUMERIC;
    v_cost_per_pack := (v_entry->>'cost_per_pack_minor')::BIGINT;
    v_supplier := v_entry->>'supplier';
    v_occurred_at := COALESCE((v_entry->>'occurred_at')::TIMESTAMPTZ, now());

    -- Customer resolution
    v_customer_id := (v_entry->>'customer_id')::UUID;
    v_cust_name := trim(v_entry->>'customer_name');
    IF v_customer_id IS NULL AND v_cust_name IS NOT NULL AND v_cust_name <> '' THEN
      SELECT id INTO v_customer_id FROM customers
      WHERE user_id = v_user_id AND lower(name) = lower(v_cust_name)
      LIMIT 1;

      IF v_customer_id IS NULL THEN
        INSERT INTO customers (user_id, name)
        VALUES (v_user_id, v_cust_name)
        RETURNING id INTO v_customer_id;
      END IF;
    END IF;

    -- Item resolution
    v_item_id := (v_entry->>'item_id')::UUID;
    IF v_item_id IS NULL AND (v_entry->>'newItemName') IS NOT NULL THEN
      INSERT INTO items (user_id, name, unit, current_qty)
      VALUES (v_user_id, trim(v_entry->>'newItemName'), COALESCE(v_entry->>'unit', 'piece'), 0)
      ON CONFLICT (user_id, lower(name)) WHERE archived_at IS NULL
      DO UPDATE SET updated_at = now()
      RETURNING id INTO v_item_id;
    END IF;

    -- Check if already committed for this batch + line_no (idempotency check)
    SELECT EXISTS(
      SELECT 1 FROM entries
      WHERE user_id = v_user_id AND batch_id = p_batch_id AND line_no = v_idx
    ) INTO v_already_exists;

    IF NOT v_already_exists THEN
      INSERT INTO entries (
        user_id, type, item_id, quantity, unit_amount_minor, total_minor,
        payment_type, customer_id, occurred_at, source, note, reason,
        pack_type, pack_count, units_per_pack, cost_per_pack_minor, supplier,
        batch_id, line_no
      ) VALUES (
        v_user_id, v_type, v_item_id, v_qty, v_unit_amount, v_total,
        v_payment_type, v_customer_id, v_occurred_at, v_source, v_note, v_reason,
        v_pack_type, v_pack_count, v_units_per_pack, v_cost_per_pack, v_supplier,
        p_batch_id, v_idx
      ) RETURNING * INTO v_new_entry;

      -- Update items stock and record activity
      IF v_type = 'sale' AND v_item_id IS NOT NULL THEN
        SELECT current_qty INTO v_before FROM items WHERE id = v_item_id AND user_id = v_user_id;
        v_after := v_before - v_qty;
        
        UPDATE items
        SET current_qty = v_after, updated_at = now()
        WHERE id = v_item_id AND user_id = v_user_id;

        INSERT INTO stock_activity (
          user_id, item_id, action, reason, before_qty, after_qty, delta, note, batch_id
        ) VALUES (
          v_user_id, v_item_id, 'sale', 'Sale', v_before, v_after, -v_qty, v_note, p_batch_id
        );

      ELSIF v_type = 'restock' AND v_item_id IS NOT NULL THEN
        SELECT current_qty INTO v_before FROM items WHERE id = v_item_id AND user_id = v_user_id;
        v_after := v_before + v_qty;

        UPDATE items
        SET current_qty = v_after,
            cost_price_minor = COALESCE(
              CASE WHEN v_units_per_pack IS NOT NULL AND v_units_per_pack > 0 AND v_cost_per_pack IS NOT NULL
                THEN ROUND(v_cost_per_pack / v_units_per_pack)
                ELSE v_unit_amount
              END,
              cost_price_minor
            ),
            usual_pack_type = COALESCE(v_pack_type, usual_pack_type),
            usual_units_per_pack = COALESCE(v_units_per_pack, usual_units_per_pack),
            updated_at = now()
        WHERE id = v_item_id AND user_id = v_user_id;

        -- Record in purchases table
        INSERT INTO purchases (
          user_id, item_id, supplier, pack_type, pack_count, units_per_pack,
          units_added, cost_per_pack_minor, total_cost_minor, batch_id
        ) VALUES (
          v_user_id, v_item_id, v_supplier, COALESCE(v_pack_type, 'unit'),
          COALESCE(v_pack_count, v_qty), COALESCE(v_units_per_pack, 1),
          v_qty, COALESCE(v_cost_per_pack, v_unit_amount, 0), v_total, p_batch_id
        );

        -- Record in stock activity log
        INSERT INTO stock_activity (
          user_id, item_id, action, reason, before_qty, after_qty, delta, note, batch_id
        ) VALUES (
          v_user_id, v_item_id, 'restock', 'Purchased', v_before, v_after, v_qty, v_note, p_batch_id
        );
      END IF;

      v_inserted_rows := v_inserted_rows || to_jsonb(v_new_entry);
    ELSE
      SELECT * INTO v_new_entry FROM entries
      WHERE user_id = v_user_id AND batch_id = p_batch_id AND line_no = v_idx;
      v_inserted_rows := v_inserted_rows || to_jsonb(v_new_entry);
    END IF;

    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_inserted_rows;
END;
$$;

-- 6. Update adjust_stock RPC with reasons, min=0 constraint, and stock_activity logging
CREATE OR REPLACE FUNCTION adjust_stock(
  p_item_id UUID,
  p_new_qty NUMERIC,
  p_reason TEXT DEFAULT 'Counted',
  p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item items%ROWTYPE;
  v_diff NUMERIC;
  v_batch_id UUID := gen_random_uuid();
  v_old_qty NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated' USING errcode = '42501';
  END IF;

  IF p_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative (min 0)' USING errcode = '22000';
  END IF;

  IF p_reason = 'Other' AND (p_note IS NULL OR trim(p_note) = '') THEN
    RAISE EXCEPTION 'Note is required when adjustment reason is Other' USING errcode = '22000';
  END IF;

  SELECT * INTO v_item FROM items WHERE id = p_item_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found' USING errcode = 'P0002';
  END IF;

  v_old_qty := v_item.current_qty;
  v_diff := p_new_qty - v_old_qty;

  IF v_diff = 0 THEN
    RETURN to_jsonb(v_item);
  END IF;

  -- Record adjustment entry in ledger
  INSERT INTO entries (
    user_id, type, item_id, quantity, unit_amount_minor, total_minor,
    payment_type, occurred_at, source, note, reason, before_qty, after_qty,
    batch_id, line_no
  ) VALUES (
    v_user_id, 'adjustment', p_item_id, ABS(v_diff), 0, 0,
    'cash', now(), 'tap', p_note, p_reason, v_old_qty, p_new_qty,
    v_batch_id, 0
  );

  -- Record in stock_activity log
  INSERT INTO stock_activity (
    user_id, item_id, action, reason, before_qty, after_qty, delta, note, batch_id
  ) VALUES (
    v_user_id, p_item_id, 'adjustment', p_reason, v_old_qty, p_new_qty, v_diff, p_note, v_batch_id
  );

  UPDATE items
  SET current_qty = p_new_qty, updated_at = now()
  WHERE id = p_item_id AND user_id = v_user_id
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END;
$$;
