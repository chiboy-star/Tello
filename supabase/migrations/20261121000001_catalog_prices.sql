-- Migration: 20261121000001_catalog_prices.sql
-- Add reference prices to catalog items and track estimate vs user set prices on items

-- 1. Add reference price fields to catalog_items
alter table if exists catalog_items 
  add column if not exists ref_price_minor bigint,
  add column if not exists ref_price_source text,
  add column if not exists ref_price_checked_at timestamptz default now(),
  add column if not exists ref_price_confidence text check (ref_price_confidence in ('high', 'medium', 'low'));

-- 2. Add sell_price_source to items ('estimate' | 'user')
alter table if exists items 
  add column if not exists sell_price_source text check (sell_price_source in ('estimate', 'user'));

-- 3. Unique index on catalog_items(category, name)
create unique index if not exists idx_catalog_items_category_name on catalog_items (category, name);

-- 4. RPC: set_item_prices(p_updates jsonb)
-- Atomic bulk update for item prices; sets sell_price_source = 'user'
create or replace function set_item_prices(p_updates jsonb)
returns int
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_count int := 0;
  v_item_id uuid;
  v_price_minor bigint;
begin
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_updates)
  loop
    v_item_id := (v_item->>'itemId')::uuid;
    v_price_minor := (v_item->>'sellPriceMinor')::bigint;

    update items
    set sell_price_minor = v_price_minor,
        sell_price_source = 'user',
        updated_at = now()
    where id = v_item_id and user_id = v_user_id;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- 5. RPC: confirm_estimated_prices()
-- Bulk confirms all estimated prices for current user, changing source from 'estimate' to 'user'
create or replace function confirm_estimated_prices()
returns int
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int := 0;
begin
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  update items
  set sell_price_source = 'user',
      updated_at = now()
  where user_id = v_user_id
    and sell_price_source = 'estimate';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 6. Backfill existing items that have catalog_item_id, null price, and NGN currency
update items
set sell_price_minor = ci.ref_price_minor,
    sell_price_source = 'estimate',
    updated_at = now()
from catalog_items ci, profiles p
where items.catalog_item_id = ci.id
  and items.user_id = p.id
  and p.currency = 'NGN'
  and items.sell_price_minor is null
  and ci.ref_price_minor is not null;
