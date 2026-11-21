-- Migration 20261121000000_init_schema.sql
-- Tallo Core Database Schema & RLS

create extension if not exists "pg_trgm";
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  shop_name text,
  business_type text check (business_type in ('retail','wholesale')),
  currency text not null default 'NGN',
  timezone text not null default 'Africa/Lagos',
  onboarded_at timestamptz,
  utm jsonb,
  created_at timestamptz not null default now()
);

-- 2. CATALOG ITEMS (Global seed)
create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  unit text not null default 'piece',
  aliases text[] not null default '{}',
  business_types text[] not null default '{retail,wholesale}',
  is_default boolean not null default false,
  sort_order int not null default 0
);

-- 3. ITEMS (User-owned)
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  catalog_item_id uuid references catalog_items(id),
  name text not null,
  category text,
  unit text not null default 'piece',
  aliases text[] not null default '{}',
  sell_price_minor bigint,
  cost_price_minor bigint,
  current_qty numeric(12,2) not null default 0,
  reorder_lead_days int not null default 7,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists items_user_name_uq on items(user_id, lower(name)) where archived_at is null;
create index if not exists items_name_trgm on items using gin (name gin_trgm_ops);

-- 4. CUSTOMERS
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_user_name_uq on customers(user_id, lower(name));

-- 5. ENTRIES (Unified Ledger)
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('sale','restock','debt_payment')),
  item_id uuid references items(id),
  quantity numeric(12,2),
  unit_amount_minor bigint,
  total_minor bigint not null check (total_minor >= 0),
  payment_type text not null default 'cash' check (payment_type in ('cash','transfer','credit')),
  customer_id uuid references customers(id),
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('tap','text','voice','image','bot')),
  note text,
  batch_id uuid not null,
  line_no int not null default 0,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, batch_id, line_no),
  check (type = 'debt_payment' or (item_id is not null and quantity is not null and quantity > 0)),
  check (type <> 'debt_payment' or customer_id is not null),
  check (payment_type <> 'credit' or customer_id is not null)
);
create index if not exists entries_user_time on entries(user_id, occurred_at desc);
create index if not exists entries_user_item_time on entries(user_id, item_id, occurred_at desc);

-- 6. AI USAGE
create table if not exists ai_usage (
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

-- 7. WEEKLY REPORTS
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  period text not null check (period in ('week','month')),
  period_start date not null,
  facts jsonb not null,
  narrative text,
  narrative_source text check (narrative_source in ('llm','template')),
  generated_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

-- 8. CHANNEL LINKS (Phase 5 bot)
create table if not exists channel_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('telegram','whatsapp')),
  external_id text,
  link_code text,
  link_code_expires_at timestamptz,
  verified_at timestamptz,
  unique (channel, external_id)
);

-- 9. CUSTOMER BALANCES VIEW
create or replace view customer_balances as
select
  c.id as customer_id,
  c.user_id,
  c.name,
  c.phone,
  coalesce(
    sum(case when e.type = 'sale' and e.payment_type = 'credit' and e.voided_at is null then e.total_minor else 0 end)
    - sum(case when e.type = 'debt_payment' and e.voided_at is null then e.total_minor else 0 end),
    0
  )::bigint as balance_minor,
  (
    select min(e2.occurred_at)
    from entries e2
    where e2.customer_id = c.id
      and e2.type = 'sale'
      and e2.payment_type = 'credit'
      and e2.voided_at is null
  ) as oldest_unpaid_at
from customers c
left join entries e on e.customer_id = c.id
group by c.id, c.user_id, c.name, c.phone;

-- 10. ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table catalog_items enable row level security;
alter table items enable row level security;
alter table customers enable row level security;
alter table entries enable row level security;
alter table ai_usage enable row level security;
alter table weekly_reports enable row level security;
alter table channel_links enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Profiles are viewable and updatable by owner" on profiles;
create policy "Profiles are viewable and updatable by owner"
  on profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Catalog items viewable by authenticated users" on catalog_items;
create policy "Catalog items viewable by authenticated users"
  on catalog_items for select
  to authenticated
  using (true);

drop policy if exists "Users own items" on items;
create policy "Users own items"
  on items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own customers" on customers;
create policy "Users own customers"
  on customers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own entries" on entries;
create policy "Users own entries"
  on entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own ai_usage" on ai_usage;
create policy "Users own ai_usage"
  on ai_usage for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own weekly_reports" on weekly_reports;
create policy "Users own weekly_reports"
  on weekly_reports for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own channel_links" on channel_links;
create policy "Users own channel_links"
  on channel_links for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 11. PROFILE CREATION TRIGGER ON AUTH.USERS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, utm)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Shop Owner'),
    coalesce(new.raw_user_meta_data->'utm', null)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 12. RPC FUNCTIONS (security invoker, atomic)

-- commit_entries: atomic batch commit with idempotency and stock updates
create or replace function commit_entries(p_batch_id uuid, p_entries jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry jsonb;
  v_idx int := 0;
  v_item_id uuid;
  v_customer_id uuid;
  v_type text;
  v_qty numeric;
  v_unit_amount bigint;
  v_total bigint;
  v_payment_type text;
  v_source text;
  v_note text;
  v_occurred_at timestamptz;
  v_cust_name text;
  v_inserted_rows jsonb := '[]'::jsonb;
  v_already_exists boolean;
  v_new_entry entries%rowtype;
begin
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_type := v_entry->>'type';
    v_qty := (v_entry->>'quantity')::numeric;
    v_unit_amount := (v_entry->>'unit_amount_minor')::bigint;
    v_total := coalesce((v_entry->>'total_minor')::bigint, 0);
    v_payment_type := coalesce(v_entry->>'payment_type', 'cash');
    v_source := coalesce(v_entry->>'source', 'tap');
    v_note := v_entry->>'note';
    v_occurred_at := coalesce((v_entry->>'occurred_at')::timestamptz, now());

    -- Customer resolution
    v_customer_id := (v_entry->>'customer_id')::uuid;
    v_cust_name := trim(v_entry->>'customer_name');
    if v_customer_id is null and v_cust_name is not null and v_cust_name <> '' then
      select id into v_customer_id from customers
      where user_id = v_user_id and lower(name) = lower(v_cust_name)
      limit 1;

      if v_customer_id is null then
        insert into customers (user_id, name)
        values (v_user_id, v_cust_name)
        returning id into v_customer_id;
      end if;
    end if;

    -- Item resolution
    v_item_id := (v_entry->>'item_id')::uuid;
    if v_item_id is null and (v_entry->>'newItemName') is not null then
      insert into items (user_id, name, unit, current_qty)
      values (v_user_id, trim(v_entry->>'newItemName'), coalesce(v_entry->>'unit', 'piece'), 0)
      on conflict (user_id, lower(name)) where archived_at is null
      do update set updated_at = now()
      returning id into v_item_id;
    end if;

    -- Check if already committed for this batch + line_no (idempotency check)
    select exists(
      select 1 from entries
      where user_id = v_user_id and batch_id = p_batch_id and line_no = v_idx
    ) into v_already_exists;

    if not v_already_exists then
      insert into entries (
        user_id, type, item_id, quantity, unit_amount_minor, total_minor,
        payment_type, customer_id, occurred_at, source, note, batch_id, line_no
      ) values (
        v_user_id, v_type, v_item_id, v_qty, v_unit_amount, v_total,
        v_payment_type, v_customer_id, v_occurred_at, v_source, v_note, p_batch_id, v_idx
      ) returning * into v_new_entry;

      -- Update items stock only if row inserted
      if v_type = 'sale' and v_item_id is not null then
        update items
        set current_qty = current_qty - v_qty, updated_at = now()
        where id = v_item_id and user_id = v_user_id;
      elsif v_type = 'restock' and v_item_id is not null then
        update items
        set current_qty = current_qty + v_qty,
            cost_price_minor = coalesce(v_unit_amount, cost_price_minor),
            updated_at = now()
        where id = v_item_id and user_id = v_user_id;
      end if;

      v_inserted_rows := v_inserted_rows || to_jsonb(v_new_entry);
    else
      select * into v_new_entry from entries
      where user_id = v_user_id and batch_id = p_batch_id and line_no = v_idx;
      v_inserted_rows := v_inserted_rows || to_jsonb(v_new_entry);
    end if;

    v_idx := v_idx + 1;
  end loop;

  return v_inserted_rows;
end;
$$;

-- void_entry
create or replace function void_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec entries%rowtype;
begin
  select * into v_rec from entries where id = p_entry_id and user_id = v_user_id;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;

  if v_rec.voided_at is not null then
    return to_jsonb(v_rec); -- No-op if already voided
  end if;

  update entries
  set voided_at = now()
  where id = p_entry_id and user_id = v_user_id
  returning * into v_rec;

  -- Reverse stock effect
  if v_rec.type = 'sale' and v_rec.item_id is not null then
    update items set current_qty = current_qty + v_rec.quantity, updated_at = now()
    where id = v_rec.item_id and user_id = v_user_id;
  elsif v_rec.type = 'restock' and v_rec.item_id is not null then
    update items set current_qty = current_qty - v_rec.quantity, updated_at = now()
    where id = v_rec.item_id and user_id = v_user_id;
  end if;

  return to_jsonb(v_rec);
end;
$$;

-- unvoid_entry
create or replace function unvoid_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec entries%rowtype;
begin
  select * into v_rec from entries where id = p_entry_id and user_id = v_user_id;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;

  if v_rec.voided_at is null then
    return to_jsonb(v_rec); -- No-op if not voided
  end if;

  update entries
  set voided_at = null
  where id = p_entry_id and user_id = v_user_id
  returning * into v_rec;

  -- Re-apply stock effect
  if v_rec.type = 'sale' and v_rec.item_id is not null then
    update items set current_qty = current_qty - v_rec.quantity, updated_at = now()
    where id = v_rec.item_id and user_id = v_user_id;
  elsif v_rec.type = 'restock' and v_rec.item_id is not null then
    update items set current_qty = current_qty + v_rec.quantity, updated_at = now()
    where id = v_rec.item_id and user_id = v_user_id;
  end if;

  return to_jsonb(v_rec);
end;
$$;

-- void_batch
create or replace function void_batch(p_batch_id uuid)
returns int
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec record;
  v_count int := 0;
begin
  for v_rec in
    select id from entries
    where batch_id = p_batch_id and user_id = v_user_id and voided_at is null
  loop
    perform void_entry(v_rec.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- unvoid_batch
create or replace function unvoid_batch(p_batch_id uuid)
returns int
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec record;
  v_count int := 0;
begin
  for v_rec in
    select id from entries
    where batch_id = p_batch_id and user_id = v_user_id and voided_at is not null
  loop
    perform unvoid_entry(v_rec.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- adjust_stock
create or replace function adjust_stock(p_item_id uuid, p_new_qty numeric, p_note text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_item items%rowtype;
  v_diff numeric;
  v_batch_id uuid := gen_random_uuid();
  v_type text;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Note is required for stock adjustment' using errcode = '22000';
  end if;

  select * into v_item from items where id = p_item_id and user_id = v_user_id;
  if not found then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  v_diff := p_new_qty - v_item.current_qty;
  if v_diff = 0 then
    return to_jsonb(v_item);
  end if;

  if v_diff > 0 then
    v_type := 'restock';
  else
    v_type := 'sale';
  end if;

  insert into entries (
    user_id, type, item_id, quantity, unit_amount_minor, total_minor,
    payment_type, occurred_at, source, note, batch_id, line_no
  ) values (
    v_user_id, v_type, p_item_id, abs(v_diff), 0, 0,
    'cash', now(), 'text', p_note, v_batch_id, 0
  );

  update items
  set current_qty = p_new_qty, updated_at = now()
  where id = p_item_id and user_id = v_user_id
  returning * into v_item;

  return to_jsonb(v_item);
end;
$$;

-- increment_ai_usage
create or replace function increment_ai_usage(p_limit int)
returns table(allowed boolean, used int)
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_tz text := 'Africa/Lagos';
  v_today date;
  v_curr_count int;
begin
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select coalesce(timezone, 'Africa/Lagos') into v_tz from profiles where id = v_user_id;
  v_today := (now() at time zone v_tz)::date;

  insert into ai_usage (user_id, day, count)
  values (v_user_id, v_today, 0)
  on conflict (user_id, day) do nothing;

  select count into v_curr_count from ai_usage where user_id = v_user_id and day = v_today;

  if v_curr_count >= p_limit then
    return query select false, v_curr_count;
  else
    update ai_usage
    set count = count + 1
    where user_id = v_user_id and day = v_today
    returning count into v_curr_count;

    return query select true, v_curr_count;
  end if;
end;
$$;
