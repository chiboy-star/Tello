# Tallo — Round 4: splash on first open, skeletons, install banner, add items, price estimates

Same working rules as before: paste raw command output, never reuse old numbers, never loosen an assertion (list every test file you edit and why), report every deviation, write "not done" for anything you did not do, no paid services, no animation library (CSS and Web Animations API only), no push and no remote. Make small Conventional Commits on `main` as you go. The final commit must pass lint, typecheck, unit tests and build.

I watched my own screen recording of the app (`pnpm dev`, Chrome, dark mode). What it shows, so you do not have to guess:

- At 0:00 to 0:03 the splash plays correctly, but only because I added `?splash=1`. When I opened a fresh tab at `localhost:3000` (0:20 to 0:25) it went straight to the dashboard with no splash.
- At the very start of the splash clip there is one pure white frame before the dark splash paints (white flash in dark mode).
- At 0:25 the page shows only the sidebar with an empty main area. At 0:28 I click Stock: the URL is already `/stock`, but the old Home content is still on screen. At 0:29 the main area is completely blank, about one second. At 0:30 Debts appears fully. At no point is a skeleton visible, even though you reported `loading.tsx` files and skeleton placeholders as done.
- A red "N 1 Issue" Next.js dev indicator sits bottom-left on every page from 0:07 onwards.
- Home shows every Quick Sell tile as ₦0 and "0 derica left". Items have no prices.
- There is no install icon in the address bar and no install prompt anywhere.

---

## Part 1: splash on first open (policy change)

New policy, one constant in `lib/config.ts` (`SPLASH_POLICY`) so I can change it later:
- **Web:** play on the first page load of every browser session (new tab or window), on whatever route is opened (`/`, `/home`, `/login`...), and always on the very first visit on a device. Track with `sessionStorage["tallo.splash.session"]`, set when the splash **starts**. A reload in the same tab does not replay it.
- **Installed PWA:** every cold launch (compact version), same session flag.
- `?splash=1` forces it, `?splash=0` suppresses it (for tests).
- Stop using `localStorage["tallo.intro.v1"]` to suppress the splash. Keep the key only to mean "has ever seen it".
- The decision stays in the inline head script and the splash markup stays server-rendered, as built in Round 3.

Fix the white flash: add an inline critical `<style>` in `<head>` that sets `html { background }` to the theme background before any external CSS, `<meta name="color-scheme" content="light dark">`, and make sure the splash container (fixed, inset 0, its own background) is in the SSR HTML so the very first paint is already the splash colour. Respect the saved theme (light/dark/system) in the inline script before paint.

Tests: update `auth.helper.ts` and any spec that suppressed the splash so they set the session flag with `context.addInitScript`; list every edit. New tests: fresh context opening `/` shows the splash within 500 ms and hides by 3.5 s; opening `/home` directly as a logged-in user also shows it; a second navigation in the same tab does not; a new context (new session) shows it again; `?splash=0` suppresses; a unit-style test that the SSR HTML contains the critical background style and the splash element. Give me a frame strip (0, 100, 300, 600, 1000, 1500, 2000 ms) of a fresh tab opening `/home` in dark mode, with no white frame, and a short recording.

---

## Part 2: skeleton loaders and never a blank frame

Root cause to find first. Your Round 3 report says skeletons render within one frame, and my recording says otherwise. Reproduce it in `pnpm dev` and in `next build --webpack && next start`, then explain exactly why the blank main area happens (candidates: pages returning `null` until a `mounted` flag, `loading.tsx` not covering the shell's main area, the `.page-enter` fade starting at opacity 0 over the skeleton, the route compile in dev, the new page waiting for data before rendering anything).

Requirements:
1. **Never blank.** No page, layout or shell component may render `null` or an empty main area. Remove `mounted` gating from anything that wraps page content. The SSR HTML of every app route must already contain the skeleton for that route.
2. **Instant route skeleton on pointer-down.** The shell already keeps `pendingHref` for the sliding pill. Use it: when the user presses a tab and the target route's primary query is **not in the TanStack cache**, render that route's skeleton in the main area **within one frame**, even in dev while the route is still compiling, even if the network is slow. When the data **is** cached, keep the current content until the new page is ready and show no skeleton at all (no flicker). Use one skeleton component per route in `components/skeletons/`, shared by `loading.tsx`, the pending state and in-page loading, so there is a single source.
3. Skeletons match the final layout of each route (Home strip and rows, Stock list, Debts table, Reports sections, Sell tile grid, detail pages `/stock/[itemId]`, `/debts/[customerId]`), carry `data-skeleton`, shimmer only while visible, and respect reduced motion. `loading.tsx` must exist for the `(app)` group and every route, including dynamic ones.
4. The page content enter transition must never start from opacity 0 on top of an invisible skeleton. Skeleton to content is a short crossfade, not a blink.
5. **The "1 Issue" dev indicator:** open it, report the exact message(s), fix the root cause. Do not hide the indicator.
6. **Blank-frame test (the real test).** In the page, via `addInitScript`, run a `requestAnimationFrame` sampler that records every frame during a navigation where `#main-content` has neither a `[data-skeleton]` nor visible real content. Required: **zero blank frames** over 5 tabs × 3 rounds in each condition: (a) warm cache; (b) cold cache with every `/api/**` response delayed 1500 ms using `page.route`; (c) CDP network throttling (Slow 4G) plus 4x CPU throttling. Run on the production build and on `next dev`. Also report, per tab, time from pointer-down to first skeleton frame (target under 50 ms) and to real content. If dev cannot meet content timing because of on-demand compile, say so with numbers, but the skeleton must still appear immediately.
7. **Fix the timing method.** Your explanation that Playwright's visible check waited for the 140 ms fade is wrong: Playwright counts `opacity: 0` elements as visible. Find the real ~100 to 130 ms floor (fixed wait, double rAF, view transition, something else) and report it. Measure in-page from `pointerdown` to the first frame where the target heading is in the DOM and its computed opacity is above 0.9, with no fixed waits, 20 or more samples per tab, raw samples in the report, mobile and desktop, warm and cold.
8. Add a README section "How to feel the real speed": `pnpm build && pnpm start`, because dev compiles each route on first visit.

---

## Part 3: our own install banner, and why no browser install prompt appears

1. **Diagnose.** On the production build (`next start`), use a Playwright Chromium CDP session and call `Page.getInstallabilityErrors`; paste the raw result. Check the manifest: real-logo PNG icons at 192 and 512 plus a 512 maskable icon, generated from `public/icons/icon.svg` by a script (`pnpm icons`), `id`, `start_url`, `scope`, `display: standalone`, `name`, `short_name`, `theme_color`, `background_color`. Verify what is referenced now (earlier phases generated placeholder icons; the design pass added SVGs) and fix whatever is wrong. In the report state plainly: the service worker is off in dev, so installability can only be tested on the production build; installing needs a secure origin (`localhost` or HTTPS), so a phone on the LAN address `http://10.x.x.x:3000` cannot install it.
2. **One implementation.** Replace `components/install-prompt.tsx` with an `InstallProvider` mounted in the **root layout**, so `beforeinstallprompt` is captured on every page including the landing page, before any component mounts. It exposes `canInstall`, `platform` (`chromium | ios | other`), `isStandalone`, `install()`, `dismiss()`. Handle `userChoice` and `appinstalled`, and clear the deferred event after use.
3. **UI** (all design rules apply: tokens, Lucide icons, radius tokens, one card level, no gradient, one primary action, slide-up once 200 ms, reduced motion):
   - `InstallBanner`: bottom on phones (above the tab bar, safe-area aware), a compact card bottom-right on desktop. Copy: "Install Tallo. Opens instantly and works offline." Buttons: primary **Install**, ghost **Not now**.
   - A persistent "Install app" action whenever installable: landing header, sidebar footer, Settings.
   - **iOS Safari** has no install event: show a Drawer with steps "Tap Share, then Add to Home Screen" using Lucide `Share` and `SquarePlus`.
   - Hidden when running standalone and after install. "Not now" snoozes 7 days (`localStorage["tallo.install.snooze"]`).
   - Appears after the splash has finished and the user has stayed about 4 seconds; on the landing page and `/home`; never over `/login`, `/signup`, `/onboarding` forms and never while a Drawer or dialog is open.
4. Update `DESIGN.md` (install banner section, allowed animation row).
5. **Tests:** dispatch a synthetic `beforeinstallprompt` (with a `prompt()` spy and a `userChoice` promise): banner visible, Install calls `prompt()` exactly once, banner disappears, `appinstalled` hides every install affordance; iOS user-agent shows the instruction Drawer; standalone stub hides everything; snooze works; no banner during the splash. Plus the real CDP installability check on the production build must return zero errors, or list them.

---

## Part 4: add new items to the shop

Right now a shop can only contain what onboarding picked.
1. **Entry points:** Stock page header button "Add item" (primary), the Stock empty state, the Home checklist item "Add at least 5 items", a final "+ Add item" tile in the Sell tap grid, and the existing command menu "Add item" action (wire it).
2. **Drawer (vaul)** with two tabs:
   - **From catalog:** search, category chips, list of catalog items not yet in this shop (owned ones hidden or disabled "In your shop"), multi-select, primary button "Add N items". Each row shows the unit and the estimated price (Part 5).
   - **Custom item:** name (required), unit (suggestions plus free text, default `piece`), category, selling price, cost price (optional), opening stock (optional), and "More options" disclosure with reorder lead days.
3. **API:** extend `GET /api/catalog` with `q`, `category`, `excludeOwned=1` and `all=1` (no business-type restriction); add `POST /api/items/bulk` (catalog adds, with `Idempotency-Key`); keep `POST /api/items` for custom. The unique index on `(user_id, lower(name))` for non-archived items must produce a friendly `409 DUPLICATE_ITEM` ("You already have Rice"). If an archived item has the same name, offer **Restore** (`PATCH /api/items/:id` with `archived: false`). Validate with zod; trim and cap names.
4. **Opening stock** must keep ledger and stock consistent. Record it as a `restock` entry through `commit_entries` with total 0 and note "Opening stock", so void/unvoid still works. If you choose a different approach, state which and why.
5. Optimistic add (item appears instantly, rolls back on error) with an Undo toast ("3 items added · Undo" archives them).
6. **Tests:** E2E add a custom item (appears in Stock and in the Sell tap grid), add 3 from catalog, duplicate error, archived restore, Undo; API tests for validation, duplicates and idempotent bulk add; DB test that opening stock equals the ledger and that user B cannot see user A's new items.

---

## Part 5: estimated prices so nobody types ₦0 for every item

Be honest about what is possible. There is no free, reliable API for Nigerian shop prices. Do **not** build a runtime scraper and do not call retailer sites from the app. Build three layers:

**A. Researched reference prices in the catalog (mandatory).**
- Search the web for a credible recent Nigerian retail price for each catalog row (all 75 plus anything you add), **for the row's own unit** (derica, sachet, pack, bottle, carton...). Preferred sources: the NBS "Selected Food Prices Watch" for staples (rice, beans, garri, oil...), public retailer or marketplace listing pages read by you as references for branded packaged goods, manufacturer or distributor price lists.
- **Never invent a price.** If you cannot find a credible source for a row and unit (or the unit conversion is not documented), leave it null and list it.
- Write `docs/PRICE_SOURCES.md`: item, unit, price (NGN), source URL, date accessed, confidence (high/medium/low), assumption (brand and pack size). Put the values in `lib/catalog/catalog.data.ts` as `refPrice`.
- Wholesale rows (carton, bag, crate) get their own price for that unit or null.

**B. Prefill as editable estimates.**
- Migration (one new idempotent file, `add column if not exists`; I run it in the Supabase SQL Editor, so also give me numbered steps): `catalog_items.ref_price_minor`, `ref_price_source`, `ref_price_checked_at`, `ref_price_confidence`; `items.sell_price_source` (`'estimate' | 'user'`); a unique `(category, name)` on `catalog_items` if safe; RPC `set_item_prices(p_updates jsonb)` (atomic bulk update, sets source `'user'`) and `confirm_estimated_prices()`; backfill existing items that have no price and a `catalog_item_id` from the catalog estimate. `supabase/seed_prices.sql` generated from the catalog data as `UPDATE ... WHERE category and name`, safe to re-run.
- Prefill only when the profile currency is NGN and the reference price is not null, in `POST /api/onboarding/complete`, in catalog adds (Part 4) and in the backfill. A price the user set is never overwritten.
- Quick Sell and Sell tap tiles must never show ₦0. An item with no price shows "Set price" with an amber outline; tapping it opens a small price sheet first.

**Review screen** `/stock/prices` ("Review prices"):
- Header "12 prices are estimates. Check and adjust for your area." Grouped by category. Each row: name, unit, editable price (₦ prefix, `inputmode="decimal"`, tabular numbers) and a muted line "Estimate, checked Nov 2026" until edited or confirmed (muted text, not a badge).
- Enter moves to the next row; autosave on blur (optimistic, debounced bulk RPC); primary button **Confirm all**; search; filter chips Estimates / Missing / All; rows without an estimate first with an amber outline "Add price".
- Entry points: Home checklist item "Review your prices", a banner on Stock while estimates exist, Settings.

**C. Optional developer refresh script.**
- `pnpm prices:refresh [--dry-run | --apply]`: first read the current Gemini docs and tell me whether Google Search grounding is available on the free tier for the configured model, with its limits. If it is not, build nothing here and say so.
- If available: Node script with the service role, `GEMINI_PRICE_MODEL` env var, batches of 10 or fewer items, JSON output with price, unit, source URL and date. Reject results without a URL. Flag changes over ±40% for manual review instead of applying. Default is dry-run (prints a diff table); `--apply` writes **only** to `catalog_items`, never to users' `items`. Cap requests per run, append to `docs/PRICE_REFRESH_LOG.md`.

**Tests:** unit: prefill logic (NGN only, null stays null, never overwrites a user price); DB integration: `set_item_prices` atomicity, RLS (user B cannot change user A's prices), backfill idempotent; E2E: onboarding then Home shows estimated prices and no ₦0 tiles; edit one price on the review screen, Confirm all, estimate count goes to 0; tapping a tile with no price asks for a price first.

---

## Final report (required)

1. Raw output of `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the full `pnpm test:e2e` (the production build for anything about speed, install or PWA).
2. Root cause of the blank main area and of the "1 Issue" indicator, with evidence.
3. Blank-frame test results per condition (warm, cold with delayed API, throttled), time to skeleton and to content with 20 or more raw samples per tab, and the real cause of the ~100 to 130 ms floor.
4. Raw `Page.getInstallabilityErrors` output and the manifest icon list.
5. Frame strips and recordings: fresh-tab splash with no white frame, tab switching with skeletons (mobile and desktop), install banner (Chromium, iOS), review prices screen. Give file paths.
6. Price research summary: how many rows priced, how many null, confidence breakdown, link to `docs/PRICE_SOURCES.md`; the answer on grounding availability.
7. The new SQL file names and my numbered steps to run them.
8. Every test file edited and why; `git log --oneline` and `git status`.
9. A table of Parts 1 to 5: each requirement done / partly / not done, with file and notes, and anything you could not verify (for example installing on a real phone).
