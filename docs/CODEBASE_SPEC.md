# TALLO — Codebase Specification (for the build agent)

> **Read this whole document before writing any code.**
> You are building the MVP of **Tallo**, a sales and stock tracker for small shop owners. It is a school project, so **everything must run on free tiers and stay lightweight.** Do not add paid services, and do not add features that are not in this document.
> A separate `DESIGN.md` will be given to you later. **Do not do visual polish now.** Use stock shadcn/ui styling, but build the structure, routes, states and logic exactly as specified here.

---

## 0. How you must work

1. Build in the **phases** in section 14, in order. Do not skip ahead.
2. Write the **tests listed in section 13** as you go, not at the end. A phase is not done until its tests pass.
3. Never claim something works unless you ran it. Paste real command output in your report.
4. If a spec point is impossible or wrong (an API changed, a free tier no longer allows it), **do not silently work around it.** Note it under "Deviations" in your report and pick the simplest alternative.
5. Never invent secrets. Create `.env.example` and list what the human must fill in.
6. After **Phase 4**, STOP and send the report using the template in section 15. Phase 5 (bot) and the design pass only start after review.

---

## 1. Product in one paragraph

Tallo lets a small shop owner (retail or wholesale) record sales by **tapping, typing, speaking or photographing a handwritten note**. It keeps stock counts up to date, predicts when each item will run out, tracks **who owes money (credit sales)**, and produces a **weekly/monthly summary** with buy-more / buy-less advice based on real numbers. It works as a website and as an installable PWA. A chat bot (Telegram first, WhatsApp second) that accepts voice notes is a later stretch.

### In scope (MVP)
- Email/password signup and login (name, email, password only)
- Light onboarding: business type, categories, item checklist from a fixed catalog
- Item management and stock levels
- Sale, restock and debt-payment entry by: quick-tap tiles, free text, voice, image
- AI parsing with a mandatory **confirm screen** for voice, image and free text
- Stock forecast ("days left", run-out date, status)
- Customers and credit ledger (who owes what)
- Weekly and monthly report (facts computed in code, narrative phrased by the LLM)
- Undo for every entry (soft void)
- PWA (installable, offline shell, offline queue for quick-tap sales)
- Command menu search

### Out of scope (do NOT build)
- Suggestions that re-rank every 2 selections (use a fixed list)
- Shop-photo or voice-based onboarding
- Multi-user or staff accounts
- Payments, subscriptions, billing
- Supplier marketplace, loans, anonymized benchmarking
- Native apps
- Multiple LLM providers (Gemini only, behind an interface)

---

## 2. Stack (all free tier)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (latest stable, App Router) + TypeScript (strict)** | Route Handlers are the backend |
| Styling | **Tailwind CSS + shadcn/ui** (Radix primitives) | Icons: **lucide-react** only |
| Data fetching | **TanStack Query** | Optimistic updates, stale-while-revalidate |
| Forms | react-hook-form + zod resolver | |
| Validation | **zod** | One schema per request/response, shared client and server |
| Backend services | **Supabase** (Auth, Postgres, optional Storage) | Free tier. `@supabase/supabase-js`, `@supabase/ssr` |
| AI | **Google Gemini API** via `@google/genai` | Free tier. One provider behind `AiProvider` interface |
| PWA | **Serwist** (`@serwist/next`) | Service worker, manifest |
| Theming | next-themes | |
| Fuzzy match | fuse.js | Item-name matching |
| Dates | date-fns + date-fns-tz | |
| Offline queue | idb-keyval | IndexedDB |
| Unit/integration tests | **Vitest** + Testing Library | |
| E2E tests | **Playwright** | AI provider mocked |
| Hosting | Vercel (Hobby) | |
| Package manager | pnpm | |

Rules:
- **Verify current versions and free-tier limits from official docs before using them**, and pin versions in `package.json`. Do not trust numbers in this document for limits; they change.
- **Gemini model name must come from env var `GEMINI_MODEL`.** Check Google AI Studio docs for the current free-tier Flash-class model that accepts audio and images, and set that as the default in `.env.example`.
- Vercel Hobby request bodies are limited (about 4.5 MB) and function time is limited. Compress images client-side and cap audio length (section 8). Set `export const maxDuration` on AI routes to the highest value the plan allows.
- Supabase's built-in email sender is heavily rate-limited. For the MVP, **turn off email confirmation** in the Supabase Auth settings so signup logs the user in instantly. Document this in the report.

---

## 3. Repository layout

```
tallo/
├─ app/
│  ├─ (marketing)/page.tsx            # landing (static, pre-rendered)
│  ├─ (auth)/login/page.tsx
│  ├─ (auth)/signup/page.tsx
│  ├─ onboarding/page.tsx             # 3-step flow
│  ├─ (app)/layout.tsx                # app shell: nav, command menu, providers
│  ├─ (app)/home/page.tsx
│  ├─ (app)/sell/page.tsx             # Tap | Speak | Snap | Type
│  ├─ (app)/stock/page.tsx
│  ├─ (app)/stock/[itemId]/page.tsx
│  ├─ (app)/debts/page.tsx
│  ├─ (app)/debts/[customerId]/page.tsx
│  ├─ (app)/reports/page.tsx
│  ├─ (app)/settings/page.tsx
│  ├─ api/...                         # see section 9
│  ├─ manifest.ts
│  ├─ sw.ts                           # Serwist service worker
│  ├─ offline/page.tsx
│  └─ not-found.tsx
├─ components/ui/                     # shadcn
├─ components/                        # feature components
├─ lib/
│  ├─ supabase/{client.ts,server.ts,admin.ts}
│  ├─ ai/{provider.ts,gemini.ts,mock.ts,prompts.ts,schemas.ts}
│  ├─ domain/{forecast.ts,insights.ts,matching.ts,money.ts,time.ts,debts.ts}
│  ├─ catalog/catalog.data.ts         # seed source of truth
│  ├─ api/{client.ts,errors.ts,withAuth.ts,idempotency.ts}
│  └─ offline/queue.ts
├─ supabase/
│  ├─ migrations/*.sql
│  ├─ seed.sql                        # generated from catalog.data.ts
│  └─ tests/*.sql                     # pgTAP, if Docker available
├─ tests/{unit,integration,e2e}/
├─ public/{icons,images}/
├─ .env.example
└─ README.md                          # run, test, deploy instructions
```

---

## 4. Environment variables (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server only. used ONLY by bot webhooks and tests
GEMINI_API_KEY=
GEMINI_MODEL=                         # check current free-tier flash model
AI_PROVIDER=gemini                    # gemini | mock  (mock is used in tests/e2e)
AI_DAILY_LIMIT_PER_USER=30            # protects the free tier
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Phase 5 (bot)
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=
```
`SUPABASE_SERVICE_ROLE_KEY` must never be imported in client code. Add a test or lint rule that fails if it is.

---

## 5. Data model (Postgres / Supabase)

**Conventions:** money is stored as **integer minor units** (e.g. kobo) in `bigint` columns ending `_minor`. Never use floats for money. Timestamps are `timestamptz`. Every user-owned table has `user_id` and **Row Level Security enabled**.

```sql
create extension if not exists pg_trgm;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  shop_name text,
  business_type text check (business_type in ('retail','wholesale')),
  currency text not null default 'NGN',
  timezone text not null default 'Africa/Lagos',
  onboarded_at timestamptz,
  utm jsonb,                                   -- captured at signup
  created_at timestamptz not null default now()
);

create table catalog_items (                    -- global, read-only to users
  id uuid primary key default gen_random_uuid(),
  category text not null,                       -- 'everyday' | 'food' | 'drinks' | 'household' | 'personal_care'
  name text not null,
  unit text not null default 'piece',
  aliases text[] not null default '{}',
  business_types text[] not null default '{retail,wholesale}',
  is_default boolean not null default false,    -- pre-selected during onboarding
  sort_order int not null default 0
);

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  catalog_item_id uuid references catalog_items(id),
  name text not null,
  category text,
  unit text not null default 'piece',
  aliases text[] not null default '{}',
  sell_price_minor bigint,
  cost_price_minor bigint,
  current_qty numeric(12,2) not null default 0,  -- may go negative; UI warns
  reorder_lead_days int not null default 7,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index items_user_name_uq on items(user_id, lower(name)) where archived_at is null;
create index items_name_trgm on items using gin (name gin_trgm_ops);

create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create unique index customers_user_name_uq on customers(user_id, lower(name));

-- One ledger table for sales, restocks and debt payments
create table entries (
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
  batch_id uuid not null,                       -- = client idempotency key
  line_no int not null default 0,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, batch_id, line_no),
  check (type = 'debt_payment' or (item_id is not null and quantity is not null and quantity > 0)),
  check (type <> 'debt_payment' or customer_id is not null),
  check (payment_type <> 'credit' or customer_id is not null)
);
create index entries_user_time on entries(user_id, occurred_at desc);
create index entries_user_item_time on entries(user_id, item_id, occurred_at desc);

create table ai_usage (
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

create table weekly_reports (
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

create table channel_links (                     -- Phase 5
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('telegram','whatsapp')),
  external_id text,
  link_code text,
  link_code_expires_at timestamptz,
  verified_at timestamptz,
  unique (channel, external_id)
);
```

**Credit balance** (view `customer_balances`): for each customer, sum of non-voided `sale` entries with `payment_type='credit'` minus sum of non-voided `debt_payment` entries. Also expose `oldest_unpaid_at` (date of the oldest credit sale not yet covered, using first-in-first-out against payments).

### RLS
- All user-owned tables: `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
- `catalog_items`: `select` for any authenticated user, no writes.
- `profiles`: `id = auth.uid()`.
- Create a profile row automatically on signup via a trigger on `auth.users` that reads `raw_user_meta_data` (`full_name`, `utm`).

### Postgres functions (RPC), all `security invoker`, all atomic
1. `commit_entries(p_batch_id uuid, p_entries jsonb) returns jsonb`
   - Inserts each line with `(user_id = auth.uid(), batch_id = p_batch_id, line_no = index)`.
   - **Idempotent:** uses `on conflict (user_id, batch_id, line_no) do nothing`; calling twice with the same batch id changes nothing and returns the same rows.
   - Updates `items.current_qty`: sale subtracts, restock adds. Restock with a cost sets `items.cost_price_minor`. Only apply stock changes for rows actually inserted.
   - Creates customers by name if `customer_name` is provided without an id (case-insensitive match first).
2. `void_entry(p_entry_id uuid)`: sets `voided_at`, reverses the stock effect. No-op if already voided.
3. `unvoid_entry(p_entry_id uuid)`: clears `voided_at`, re-applies the stock effect. No-op if not voided.
4. `void_batch(p_batch_id uuid)` and `unvoid_batch(p_batch_id uuid)`: same, for undoing a whole commit.
5. `adjust_stock(p_item_id uuid, p_new_qty numeric, p_note text)`: manual correction. Implemented as an offsetting entry so history stays auditable (use `source='text'`, note required).
6. `increment_ai_usage(p_limit int) returns table(allowed boolean, used int)`: atomically increments today's count (user's timezone) and refuses when over the limit.

Do not use triggers for stock changes. Keep stock logic inside these functions so it is testable.

---

## 6. Domain logic (pure TypeScript, no DB, fully unit-tested)

### 6.1 `money.ts`
- `toMinor(major: number): number` and `fromMinor(minor): number`, rounding half away from zero. Never use floating math on stored values.
- `formatMoney(minor, currency, locale)` using `Intl.NumberFormat`.
- `parseSpokenAmount("5k") -> 500000 minor` (5k = 5,000), `"2.5k" -> 2500`, `"1m"` is not supported and returns null.

### 6.2 `time.ts`
- Day bucketing always uses the **user's timezone** (`profiles.timezone`), never UTC.
- `startOfWeek` = Monday. Provide `periodRange(period, anchorDate, tz)`.

### 6.3 `forecast.ts` — stock forecast (deterministic, explainable)

Input: item, its non-voided `sale` entries, `today`, timezone.
```
WINDOW = 14 full days ending yesterday (today is partial; exclude it)
historyDays = days between max(item.created_at, first sale in window) and yesterday, inclusive
effectiveDays = clamp(historyDays, 1, 14)
avgDaily = totalUnitsSoldInWindow / effectiveDays
confidence = 'low' if historyDays < 3, 'medium' if < 7, else 'high'
daysLeft = current_qty <= 0 ? 0 : (avgDaily > 0 ? current_qty / avgDaily : null)
runOutDate = daysLeft == null ? null : today + floor(daysLeft) days
trendPct = (units last 7d - units previous 7d) / units previous 7d   (null if previous is 0)
status:
  'out'         current_qty <= 0
  'critical'    daysLeft <= 2
  'low'         daysLeft <= item.reorder_lead_days
  'overstocked' daysLeft > 45
  'no_data'     daysLeft == null
  'ok'          otherwise
suggestedReorderQty = max(0, ceil(avgDaily * (reorder_lead_days + 7) - current_qty))
```
Return all of these fields. Never throw on empty input.

### 6.4 `matching.ts` — item name matching
- Normalize: lowercase, trim, strip punctuation, collapse spaces, simple plural stripping.
- Match raw text against the user's `items.name` and `items.aliases` using fuse.js.
- Return `{ matchedItemId, score, suggestions: top3 }`. Auto-accept only when `score >= 0.85`. Below that, return suggestions and leave `matchedItemId = null`.
- Must handle: "indomie", "Indomie noodles", "2 packs of indomie", "peak milk" vs "milk", "garri" vs "gari".

### 6.5 `insights.ts` — report facts (all numbers computed here, never by the LLM)

Output `ReportFacts` JSON for a period, containing:
- `totals`: revenue, units, saleCount, creditGiven, creditCollected, restockSpend
- `vsPrevious`: percent change for revenue and units (null if previous is 0)
- `topSellers`: top 5 by revenue and top 5 by units
- `risers` / `fallers`: items with at least 5 units in either period and a change of +30% / -30% or more
- `restockSuggestions`: items with status `out`, `critical` or `low`, sorted by `daysLeft`, each with `suggestedReorderQty`
- `reduceSuggestions`: items with status `overstocked`, or zero sales in the period while `current_qty > 0`
- `debts`: totalOutstanding, top 3 debtors, count of debts older than 14 days
- `dataQuality`: `'thin'` if fewer than 7 days of data or fewer than 10 sale entries, else `'ok'`

When `dataQuality = 'thin'`, the report must say so plainly and avoid strong advice.

### 6.6 Narrative generation
- Send **only the facts JSON** to the LLM. Ask for 3 to 5 plain sentences, no markdown, no new numbers, simple English.
- Guard: extract every number from the narrative; if any number is not present in the facts (allow rounding), discard it and use the **deterministic template narrative** instead. Store `narrative_source = 'template'`.
- If the LLM errors or is rate limited, use the template. The report must always render.

---

## 7. AI layer

### 7.1 Interface
```ts
interface AiProvider {
  parseEntries(input: ParseInput): Promise<ParsedBatch>;
  writeNarrative(facts: ReportFacts): Promise<string>;
}
```
Implementations: `GeminiProvider` and `MockProvider` (deterministic fixtures, selected with `AI_PROVIDER=mock`). **All tests use the mock.** Never call the real API in automated tests.

### 7.2 Parsing contract (zod)
```ts
ParsedEntry = {
  type: 'sale' | 'restock' | 'debt_payment',
  itemText: string | null,          // what the user said/wrote
  quantity: number | null,
  unitAmount: number | null,        // major units (e.g. 500), converted to minor server-side
  totalAmount: number | null,
  paymentType: 'cash' | 'transfer' | 'credit',
  customerName: string | null,
  note: string | null,
  confidence: number                // 0..1
}
ParseResponse = {
  inputKind: 'text' | 'voice' | 'image',
  transcript: string | null,        // for voice: what was heard; for image: the text read
  entries: Array<ParsedEntry & {
    matchedItemId: string | null,   // set by SERVER via matching.ts, never by the LLM
    matchScore: number | null,
    suggestions: Array<{ itemId: string; name: string }>
  }>,
  warnings: string[],
  ai: { usedToday: number, limit: number }
}
```
Use Gemini structured output (`responseMimeType: "application/json"` plus a response schema) and validate with zod. If validation fails, retry once, then return a friendly error that tells the user to use the text or tap entry.

### 7.3 Prompt rules (`prompts.ts`)
Include in the system prompt:
- The user's currency, and their item names and aliases (cap at 200 items).
- The input may be English, Nigerian Pidgin or mixed. Examples to include: "sell 2 indomie for 500 each"; "Mama Ngozi collect 3 derica rice for credit"; "I buy 5 carton indomie 6k each"; "Mama Ngozi don pay 2k".
- "5k" means 5000. If a number is ambiguous, set it to `null` and add a warning. **Never guess quantities or prices.**
- One input may contain several entries. Return one `ParsedEntry` per item.
- Ignore chatter that is not about sales, purchases or debt payments.
- If nothing relevant is found, return `entries: []` and a warning.

### 7.4 Limits and safety
- Audio: max **60 seconds** and **2 MB**. Image: client compresses to max 1600px on the long edge, JPEG about 0.8 quality; server rejects over 3.5 MB.
- Do **not** store audio or images after parsing. Only the transcript and structured result are kept in the response; nothing is persisted until the user confirms.
- Per-user daily cap via `increment_ai_usage`. On Gemini 429 or timeout, return `503 { code: "AI_BUSY" }` and the UI falls back to tap/text entry.
- **Audio format risk:** browsers record `audio/webm` (Chrome/Android) or `audio/mp4` (Safari). Gemini supports a specific list of audio MIME types. **Verify the current list in the docs as your very first task in Phase 3 ("spike").** If a recorded format is unsupported, choose the simplest fix (record in a supported format where the browser allows it, otherwise transcode client-side) and report what you chose. Telegram and WhatsApp voice notes are OGG/Opus.

---

## 8. Pages and behavior (functional requirements)

All pages are mobile-first, work from 320px up, and handle four states: **loading (skeleton), empty, error, success**.

| Route | Requirements |
|---|---|
| `/` | Static landing page. Capture `utm_source/medium/campaign/term/content` from the URL into `localStorage`; pass them as `utm` in signup metadata. |
| `/signup` | Fields: name, email, password only. Password visibility toggle. Inline field errors. On success, go to `/onboarding`. Add `autocomplete` attributes correctly. |
| `/login` | Email and password. Link to reset password (Supabase `resetPasswordForEmail`). |
| `/onboarding` | Step 1: retail or wholesale. Step 2: select categories (multi-select). Step 3: checklist of catalog items filtered by business type and categories, with `is_default` items pre-checked, a search box, and "add custom item". Unit and optional price per item can be edited later, not required. Submit calls `POST /api/onboarding/complete`. Progress indicator shown. The list is **static per category**, it does not re-rank on selection. |
| `/home` | Today's totals (sales amount, count, credit given). "Running low" (top 3 by `daysLeft`). "Who owes you" (top 3). Quick-sell tiles. Setup checklist until complete (add 5 items, log first sale, try voice or photo, add a customer). Shows "Updated X ago". |
| `/sell` | Segmented modes: **Tap**, **Speak**, **Snap**, **Type**. See 8.1. |
| `/stock` | List of items with qty, unit, status and days left. Search. Filters: All, Low, Out. Row opens detail with history, restock, adjust, edit, archive. |
| `/debts` | Customers with balance, sorted by amount or age. Detail shows ledger, "record payment", "copy reminder message" (plain text with name, amount, shop name). |
| `/reports` | Week/Month toggle and period picker. Renders `ReportFacts` plus narrative. Sections: summary, top sellers, buy more, buy less, debts. "Copy summary" button. Print-friendly. |
| `/settings` | Name, shop name, currency, timezone, theme, export CSV (entries), channel linking (Phase 5), sign out, delete account. |
| Command menu | `Ctrl/Cmd+K` opens a menu with actions (Sell, Restock, Add item, Go to ...) and search over items and customers. |

### 8.1 `/sell` modes
- **Tap (default, the speed path):** grid of the user's top 12 items by sales count. Tap = 1 unit sale at the item's default price, paid cash. A stepper adjusts quantity, a toggle sets credit (then pick or create customer). **Optimistic update** with an Undo toast (calls `void_batch`). No confirm screen needed because input is structured.
- **Speak:** press and hold or tap to record (max 60s), upload to `POST /api/entries/parse`, show **Confirm screen**.
- **Snap:** camera capture (`<input type="file" accept="image/*" capture="environment">`) or file upload, compress client-side, upload, show **Confirm screen**.
- **Type:** two inputs: structured quick form (item, qty, price, payment) and a free-text box ("2 rice 5k credit Mama Ngozi") that goes through parse then Confirm screen.
- **Confirm screen (required for voice, image, free text):** shows transcript (if any) and one editable row per parsed entry: type, item (picker pre-filled with match, or "choose item / create new" when unmatched), quantity, unit price, payment type, customer. Rows with low confidence or missing fields are flagged and block saving until fixed. Buttons: Save all, Discard. Save calls `commit_entries` through `POST /api/entries/commit`.
- Every successful save shows an Undo toast for about 8 seconds.

### 8.2 Offline behavior
- App shell and previously loaded pages work offline.
- **Tap** sales made offline are queued in IndexedDB and flushed when the `online` event fires. Each queued item carries its `batch_id` so replays are safe (idempotent). Show a small "N waiting to sync" indicator.
- AI modes are disabled offline with a clear message.

---

## 9. API reference

### 9.1 Internal REST API (Next.js Route Handlers)

All routes: JSON, validated with zod, return errors as `{ error: { code, message, fieldErrors? } }`. All routes except `/api/health` and webhooks require a Supabase session (cookie) and use the **user-scoped** Supabase client so RLS applies. Mutating routes accept header `Idempotency-Key` (uuid) which becomes `batch_id`.

| Method and path | Request | Response |
|---|---|---|
| `GET /api/health` | none | `{ ok: true, time }` |
| `GET /api/catalog` | query: `businessType`, `categories` (csv) | `{ items: [{ id, category, name, unit, isDefault }] }` |
| `POST /api/onboarding/complete` | `{ businessType, categories[], shopName?, items: [{ catalogItemId? , name, unit?, sellPrice? }] }` | `{ ok: true, itemCount }`. Creates items, sets `onboarded_at`. Idempotent. |
| `GET /api/items` | query: `q?`, `status?`, `includeArchived?` | `{ items: [Item + forecast] }` |
| `POST /api/items` | `{ name, unit?, category?, sellPrice?, costPrice?, startingQty? }` | `{ item }` |
| `PATCH /api/items/:id` | partial fields incl. `reorderLeadDays`, `aliases` | `{ item }` |
| `DELETE /api/items/:id` | none | `{ ok }` (sets `archived_at`) |
| `POST /api/stock/adjust` | `{ itemId, newQty, note }` | `{ item }` |
| `GET /api/stock/forecast` | none | `{ forecasts: [{ itemId, ...forecast fields }], generatedAt }` |
| `POST /api/entries/parse` | `multipart/form-data`: one of `text` (string), `audio` (file), `image` (file) | `ParseResponse` (nothing saved) |
| `POST /api/entries/commit` | header `Idempotency-Key`. `{ entries: [{ type, itemId?, newItemName?, quantity?, unitAmount?, totalAmount?, paymentType, customerId?, customerName?, occurredAt?, source, note? }] }` | `{ batchId, entries: [Entry] }` |
| `GET /api/entries` | query: `from`, `to`, `type?`, `itemId?`, `customerId?`, `cursor?`, `limit?` | `{ entries, nextCursor }` |
| `POST /api/entries/:id/void` | none | `{ entry }` |
| `POST /api/entries/:id/unvoid` | none | `{ entry }` |
| `POST /api/batches/:batchId/void` | none | `{ voided: n }` |
| `POST /api/batches/:batchId/unvoid` | none | `{ restored: n }` |
| `GET /api/customers` | query: `q?` | `{ customers: [{ id, name, phone, balanceMinor, oldestUnpaidAt }] }` |
| `POST /api/customers` | `{ name, phone? }` | `{ customer }` |
| `GET /api/customers/:id` | none | `{ customer, balanceMinor, ledger: [Entry] }` |
| `POST /api/debts/payments` | header `Idempotency-Key`. `{ customerId, amount, occurredAt? }` | `{ entry, balanceMinor }` |
| `GET /api/reports` | query: `period=week\|month`, `start?` (date) | `{ facts, narrative, narrativeSource, generatedAt }`. Generated lazily on first request and cached in `weekly_reports`. Current (unfinished) period is recomputed if the cache is older than 1 hour. |
| `POST /api/reports/regenerate` | `{ period, start }` | same as above |
| `GET /api/search` | query: `q` | `{ items: [...], customers: [...] }` (max 5 each) |
| `GET /api/export/entries.csv` | query: `from`, `to` | CSV download |
| `POST /api/channels/link-code` | `{ channel }` | `{ code, expiresAt }` (6 digits, 10 minutes) |
| `DELETE /api/channels/:id` | none | `{ ok }` |
| `DELETE /api/account` | none | `{ ok }` (deletes the user's data) |
| `POST /api/bot/telegram/webhook` | Telegram update | `200` (Phase 5) |
| `GET /api/bot/whatsapp/webhook` | `hub.mode`, `hub.verify_token`, `hub.challenge` | echoes challenge (Phase 5) |
| `POST /api/bot/whatsapp/webhook` | Meta payload | `200` (Phase 5) |

Standard error codes: `UNAUTHENTICATED` (401), `VALIDATION` (422), `NOT_FOUND` (404), `AI_BUSY` (503), `AI_LIMIT` (429), `AI_PARSE_FAILED` (422), `FILE_TOO_LARGE` (413), `UNSUPPORTED_MEDIA` (415), `INTERNAL` (500).

### 9.2 External APIs used

| API | Used for | Details |
|---|---|---|
| **Supabase Auth** | signup, login, logout, password reset | `supabase.auth.signUp({ email, password, options: { data: { full_name, utm } } })`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`. Use `@supabase/ssr` cookies for server-side sessions. |
| **Supabase Postgres (PostgREST + RPC)** | all data | `supabase.from(...)`, `supabase.rpc('commit_entries', {...})`. RLS enforced. |
| **Gemini API** | parsing audio/image/text, writing narrative | Via `@google/genai`: `generateContent` with `inlineData` (base64) for audio and image parts, structured JSON output. Auth with `GEMINI_API_KEY` (server only). |
| **Telegram Bot API** (Phase 5) | bot | `setWebhook` (with `secret_token`), receive updates, `getFile` then download voice file, `sendMessage`. Verify header `X-Telegram-Bot-Api-Secret-Token`. |
| **WhatsApp Cloud API (Meta)** (Phase 5, stretch) | bot | Webhook verification (GET with `hub.challenge`), incoming messages (POST), media: `GET /{media-id}` then download URL with bearer token, reply: `POST /{phone-number-id}/messages`. Verify `X-Hub-Signature-256` with the app secret. Use Meta's free test number. Check current Graph API version in the docs. |
| **Browser APIs** | PWA and capture | `MediaRecorder`, file input with `capture`, Service Worker, Web App Manifest, IndexedDB, View Transitions API (progressive enhancement). |

---

## 10. Catalog seed (`catalog.data.ts` → `seed.sql`)

Source of truth for onboarding. Write **at least 15 items per category**, marking roughly 8 to 10 per category `is_default`. Include common Nigerian shop items and local aliases. Sample for the format (you must expand it):

```ts
{ category: 'everyday', name: 'Indomie', unit: 'pack', aliases: ['noodles','indomie noodles'], businessTypes: ['retail','wholesale'], isDefault: true }
{ category: 'everyday', name: 'Biscuits', unit: 'pack', aliases: ['biscuit'] }
{ category: 'everyday', name: 'Pure water', unit: 'sachet', aliases: ['sachet water','water'] }
{ category: 'food', name: 'Rice', unit: 'derica', aliases: ['local rice','foreign rice'] }
{ category: 'food', name: 'Beans', unit: 'derica', aliases: ['honey beans','brown beans'] }
{ category: 'food', name: 'Garri', unit: 'derica', aliases: ['gari'] }
{ category: 'food', name: 'Vegetable oil', unit: 'bottle', aliases: ['groundnut oil','cooking oil'] }
{ category: 'drinks', name: 'Coca-Cola', unit: 'bottle', aliases: ['coke','soft drink'] }
{ category: 'household', name: 'Detergent', unit: 'sachet', aliases: ['omo','ariel'] }
{ category: 'personal_care', name: 'Toothpaste', unit: 'piece' }
```
Categories: `everyday` (snacks and basics), `food` (cooking items), `drinks`, `household`, `personal_care`. Wholesale variants default to bulk units (`carton`, `bag`, `crate`). Allowed unit suggestions: piece, pack, sachet, bottle, carton, crate, bag, derica, congo, paint, litre, kg (units are free text, these are only suggestions).

---

## 11. PWA requirements

- `manifest.ts`: name "Tallo", short_name "Tallo", `display: standalone`, `start_url: /home`, `theme_color` and `background_color` from DESIGN.md (use placeholders now), icons 192, 512 and a maskable 512 (placeholder icons now; real logo comes with DESIGN.md).
- Serwist service worker: precache the app shell; **stale-while-revalidate** for `GET /api/items`, `/api/stock/forecast`, `/api/customers`, `/api/reports`; **network-only** for auth, `/api/entries/parse` and all mutations; `/offline` fallback page.
- `viewport-fit=cover`, `theme-color` meta per color scheme, iOS meta tags (`apple-mobile-web-app-capable`, touch icon).
- Install prompt component (listens to `beforeinstallprompt`, shows after the user's first saved sale, dismissible, never reappears for 14 days after dismissal).
- Lighthouse PWA/installability check must pass on the production build.

---

## 12. Security checklist

- RLS on every user table, with a test proving user A cannot read or write user B's rows.
- Service-role client used only in `lib/supabase/admin.ts`, only imported by bot webhooks.
- All inputs validated with zod. File type and size checked on the server, not only the client.
- Webhooks verify signatures or secrets (Phase 5).
- No secrets in client bundles. No logging of transcripts, tokens or passwords.
- Rate limit AI routes (daily cap plus a simple per-IP burst limit).
- Delete-account removes all user rows.

---

## 13. Tests (write them as you build)

Commands that must exist in `package.json` scripts: `lint`, `typecheck`, `test` (Vitest), `test:e2e` (Playwright), `build`.

### 13.1 Unit tests (Vitest, no network, no DB)

**money.ts**
- `toMinor(12.34) = 1234`; `toMinor(0.1+0.2) = 30`; rounding of `x.5`
- `formatMoney` for NGN
- `parseSpokenAmount`: `"5k"`, `"2.5k"`, `"500"`, `"1m"` (null), garbage (null)

**time.ts**
- A sale at 23:30 Lagos time lands on the correct local day, not the next UTC day
- `startOfWeek` returns Monday; month boundaries; leap day

**forecast.ts**
- No sales: `status='no_data'`, `daysLeft=null`, no throw
- `current_qty=0`: `status='out'`, `daysLeft=0`
- Steady 5/day, qty 20: `daysLeft=4`, correct `runOutDate`
- Today's sales are excluded from the window
- New item with 2 days of history: `confidence='low'`, uses `effectiveDays=2` not 14
- `daysLeft <= 2` gives `critical`; `<= reorder_lead_days` gives `low`; `> 45` gives `overstocked`
- Voided entries are ignored
- `trendPct` null when previous 7 days had zero units
- `suggestedReorderQty` never negative
- Negative `current_qty` treated as out

**matching.ts**
- Exact, alias, plural, case and spacing variants match
- "gari" matches "Garri"
- Ambiguous text returns suggestions and `matchedItemId=null`
- Score below 0.85 is never auto-accepted
- Empty item list does not throw

**insights.ts**
- Totals, credit given and collected computed correctly from a fixed fixture
- Top sellers ordering and tie-breaks are stable
- Risers and fallers respect the 5-unit minimum and ±30% threshold
- `dataQuality='thin'` under the thresholds
- Restock and reduce lists contain the right items
- Debts section matches ledger math
- Previous-period zero gives null percent, not Infinity or NaN

**debts.ts**
- Balance = credit sales − payments, ignoring voided entries
- Overpayment yields a negative balance (shown as credit in favor of customer) without error
- FIFO `oldest_unpaid_at` is correct with partial payments

**narrative guard**
- Narrative with an invented number is rejected and the template is used
- Rounded versions of real numbers are allowed
- LLM error falls back to the template

**schemas.ts / parse handling**
- Valid mock response passes zod; malformed JSON triggers one retry then `AI_PARSE_FAILED`
- `matchedItemId` is never taken from LLM output

### 13.2 Integration tests (API routes with mock AI; DB via local Supabase)

Use the Supabase CLI local stack (needs Docker). If Docker is not available in your environment, write the tests anyway, mark them clearly as **not run**, and say so in the report.

- Signup creates a profile row with name and UTM
- `commit_entries`: sale reduces stock; restock increases; credit sale needs a customer; debt payment reduces balance
- **Idempotency:** same `batch_id` twice leaves the same rows and the same stock
- `void_batch` then `unvoid_batch` returns stock to the exact original numbers
- `void_entry` twice does not double-reverse
- Stock can go negative without error
- RLS: user B cannot select, update, void or commit against user A's items, entries or customers
- AI daily limit: the 31st call (limit 30) returns `AI_LIMIT`
- `/api/entries/parse` rejects oversize files (`413`) and wrong types (`415`) before calling AI
- Unauthenticated calls return `401`
- Onboarding complete is idempotent and creates the selected items only
- Report generation: cached after first call; regenerated when forced; falls back to template when mock AI throws

### 13.3 E2E tests (Playwright, `AI_PROVIDER=mock`)

Run at 375×812 and 1280×800.
1. Signup, onboard (pick wholesale then a category, uncheck one pre-selected item, add one custom), land on `/home` showing the chosen items in Stock.
2. Tap-sell an item, see stock decrease, press Undo, see stock restored.
3. Type mode: free text "2 rice 5k credit Mama Ngozi" (mock) goes to Confirm screen, fix an unmatched item, save; customer shows in Debts with the right balance.
4. Voice mode: upload a fixture audio file (mock) and confirm; entry saved.
5. Image mode: upload a fixture image (mock) and confirm.
6. Record a debt payment; balance updates.
7. Reports: with seeded data, the report renders totals, top sellers and a restock suggestion.
8. Offline: go offline, tap-sell, see "1 waiting to sync", go online, queue flushes exactly once.
9. Command menu opens with Ctrl+K, finds an item.
10. Auth guard: visiting `/home` signed out redirects to `/login`.
11. Lighthouse or manifest check: manifest valid, service worker registered on the production build.

Also provide `pnpm seed:demo` that fills a demo account with **30 days of realistic fake sales, restocks and a few debts**, so reports are not empty during the school presentation.

---

## 14. Build phases and acceptance criteria

**Phase 0: Scaffold.** Next.js, Tailwind, shadcn, Supabase clients, Vitest, Playwright, lint, `.env.example`, README with run instructions, CI-style `pnpm lint && pnpm typecheck && pnpm test` passing on the empty app.
*Accept when:* app boots, `/api/health` returns ok, all scripts run.

**Phase 1: Auth, schema, onboarding.** Migrations, RLS, profile trigger, catalog seed, signup, login, onboarding, `/api/catalog`, `/api/onboarding/complete`.
*Accept when:* section 13 tests for signup, RLS, onboarding and E2E #1 and #10 pass.

**Phase 2: Items, entries, stock, debts (no AI).** Items CRUD, `commit_entries` and void functions, Tap and Type-structured modes, Undo, stock list, forecast, customers and debts, offline queue, command menu, PWA basics.
*Accept when:* all domain unit tests, DB integration tests for entries, and E2E #2, #6, #8, #9 pass.

**Phase 3: AI entry.** Spike on audio formats first. `AiProvider`, Gemini and mock, `/api/entries/parse`, Speak, Snap, free-text, Confirm screen, daily limit, fallbacks.
*Accept when:* parse and limit tests plus E2E #3, #4, #5 pass with the mock. Then **manually test once with the real Gemini key** using a recorded English voice note and a photo of a handwritten list; report the actual results honestly, including failures.

**Phase 4: Reports and demo data.** `insights.ts`, narrative with guard and template fallback, `/reports`, CSV export, demo seed script, delete account.
*Accept when:* insights and narrative tests plus E2E #7 pass; `pnpm build` succeeds; manifest check (E2E #11) passes.

**STOP. Send the report (section 15).**

**Phase 5 (after review): Bot.** Telegram first (link code flow: user generates a code in Settings, sends `/start CODE` to the bot, voice notes and text go through the same parse then reply with a summary and a link to confirm in the app; direct saving without confirmation only for high-confidence entries and always with an undo link). WhatsApp via Meta test number only if Telegram is complete and stable.

---

## 15. Report-back template (send this when Phase 4 is done)

```
# Tallo build report

## 1. Phase status
| Phase | Status (done / partial / not started) | Notes |

## 2. What was built
(bullets by area; list routes and API endpoints actually implemented)

## 3. Deviations from the spec
(every place you did something different, and why)

## 4. Test results
- Commands run, with actual output summary: pass/fail/skipped counts for unit, integration, e2e
- List every test marked skipped or not run, and why
- Lint, typecheck and build status

## 5. Real Gemini test (Phase 3 manual test)
- Voice note used, transcript returned, parsed entries, what was wrong
- Handwritten photo used, text read, parsed entries, what was wrong
- Audio format decision and why

## 6. Setup the human must do
(Supabase project, env vars, auth settings like email confirmation off, Gemini key, Vercel steps)

## 7. Known issues and risks
## 8. Free-tier limits you verified (with the date and where you read them)
## 9. Suggested next steps
```

---

## 16. Definition of done (MVP)

- A new user can sign up, finish onboarding in under 60 seconds, and log a sale in under 5 seconds with Tap.
- Speak, Snap and Type all produce a Confirm screen, and nothing is saved until the user confirms.
- Stock, "days left" and the debt ledger are correct after any mix of sales, restocks, voids and payments.
- Reports always render, even when the LLM is unavailable.
- Works offline for Tap sales, installs as a PWA, and the production build passes lint, typecheck and all tests.
- No paid service is required anywhere.
