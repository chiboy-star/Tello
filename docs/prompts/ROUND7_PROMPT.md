# Tallo: Round 7 (data that updates, stock rules, Sell multi-select, pull to refresh, purchases, stock log, real prices)

Same working rules as before: raw command output, no loosened assertions (list every test edit and why), "not done" where not done, small Conventional Commits, no push. Reproduce every bug **before** you fix it, on a production build (`pnpm build && pnpm start`) with a real signed-in user going through the real UI (not by calling the API directly), and paste what you saw. After each fix, add a test that fails before and passes after, going through the UI. Last round you reported "checklist verified" and "revenue" as working while on my screen they are not, so tests that bypass the UI are not accepted as proof.

What I see on my screen (desktop PWA, dark mode, after logging sales today):
- Home: **Today's Revenue ₦0, Sales Count 0, Credit Given ₦0**, while the checklist shows "Log your first sale" ticked and stock has gone down (Cabin Biscuit 100 to 99, Coaster Biscuit -1 to -2). So sales exist and stock moved, but the dashboard numbers did not.
- The checklist stays at 2/5 even after I do the steps.
- "Fix stock" is a flat red-on-red rectangle that looks broken. Items at 0 go to negative (Coaster Biscuit -1, -2).
- On Stock, switching All Items, Running Low and Out Of Stock feels like the whole page reloads.
- Some changes need more than one try, or a full page refresh, before they show.
- The currency dropdown in Settings is the browser's native list.
- Almost every item has a price of exactly **₦100** (Garri, Rice, Palm Oil, Salt, Sugar, Tom Tom, Gala, all Indomie but one at ₦1,000). That looks like a placeholder, not research.

---

## Part 1 (highest priority): dashboard numbers, checklist and stale data

1. **Find the root cause of Revenue, Sales Count and Credit staying at 0.** Do the whole flow in the UI on the production build: sign up a fresh user, add items with prices, make 3 sales (tap sale, quick-sell, typed sale), one on credit to a customer, then look at Home. Then query the database for that user and paste: the `entries` rows (type, voided, total, qty, created_at, batch_id), the output of the SQL behind the dashboard, and the API response of the dashboard call. State which of these is the cause, with evidence:
   - the dashboard query's "today" boundaries (they must be Africa/Lagos days using the profile timezone, converted to UTC, never `new Date().toISOString().slice(0,10)`);
   - sale totals stored as 0 because the item had no price when sold (price null or 0 at sale time);
   - the sale entry types or `voided` filter excluding rows;
   - credit sales not counted;
   - the query cache (TanStack plus the IndexedDB persister) serving old data and never refetching after a mutation, offline-queued sales not flushed;
   - the dashboard reading a table or view that is not updated by `commit_entries`.
2. **One source of truth for freshness.** Define a mutation map: for every mutation (commit sale, quick sell, void or unvoid, adjust stock, add or edit item, price change, add customer, debt payment, purchase, onboarding) list exactly which query keys it updates or invalidates (`dashboard`, `checklist`, `items`, `stock`, `entries`, `customers`, `debts`, `reports`). Implement it in one helper (`lib/query/invalidate.ts`) and use it everywhere. Rules: update the visible data **optimistically with `setQueryData`** (revenue, count, stock) and then `invalidateQueries` on settle. No `router.refresh()` hacks, no relying on page reload. Check that persisted (IndexedDB) cache never shows stale dashboard numbers after a mutation: set a short `staleTime` for dashboard and checklist, refetch on mount, on focus, on reconnect, and after queue flush.
3. **Checklist.** Prove each step against the data: add a customer from the UI, then see the tick. Explain why your Round 6 checklist spec passed while the UI did not update. If "Add a customer record" or the others are derived from a different query than the one the form invalidates, fix it. Also show the checklist state in the same API response as the dashboard so they cannot disagree.
4. **"Items sometimes need more than one try or a full refresh."** Audit every write in the app (add item, bulk add, edit price, adjust stock, archive or restore, add customer, record payment, mark paid, settings save). For each, report: what the UI does optimistically, what the cache update is, what happens on error (rollback plus a clear toast with Retry), and whether a double submit is prevented (disable the button while pending, `Idempotency-Key`). Look specifically for: a mutation that updates the server but whose `onSuccess` invalidates the wrong key; stale closures; a drawer that closes before the mutation finishes and discards the result; React Query `retry` on mutations; a service worker caching GET responses (`/api/*` must be NetworkOnly). Write one E2E per action: perform it once, assert the UI shows the change within 150 ms of the tap and still shows it after the server responds, then reload and assert it persisted. No retries, no reloads in the test before the first assertion.

## Part 2: stock cannot go below zero

I changed my mind from last round: **no negative stock at all.**
- **Server-side (the real guard):** `commit_entries` (and any RPC that reduces stock: sale, void of a restock, adjust) must reject a sale that would take `qty_on_hand` below 0 with a clear error code `INSUFFICIENT_STOCK` and the item name and available quantity, locking the item row (`SELECT ... FOR UPDATE`) so two concurrent sales cannot both pass. Whole batch is rejected atomically if any line fails, and the error lists which lines.
- **UI:** an item with 0 stock shows its tile disabled ("Out of stock") with an "Add stock" shortcut instead of selling; a tile cannot be tapped beyond available quantity (the quantity stepper stops at available, with a hint "Only 3 left"). The Adjust dialog and stock counts cannot be negative (`min=0`, validated).
- **Offline:** a queued sale that later fails with `INSUFFICIENT_STOCK` must not be silently dropped; it moves to a "Needs attention" list on Home with the reason and actions (Edit quantity, Discard).
- **Existing negative rows** (Coaster Biscuit): do not change data silently. Show them with a clear "Stock is negative, fix it" row and the Fix flow below; give me a one-time SQL (idempotent) that sets negative quantities to 0 and records an adjustment entry "Corrected from negative stock", for me to run.
- **Restyle "Fix stock".** It is currently a solid red rectangle with red text. Make it a small outlined button using the secondary style with a Lucide `PackagePlus` icon and the label "Add stock", amber outline, text colour passing contrast, same radius token and height as other small buttons, never filled red. Negative or out items show a plain "Out" text with the amber button beside it.
- Tests: concurrency test (two parallel sales for the last unit: exactly one succeeds), UI test that an out-of-stock tile cannot be tapped into a sale, offline-queued sale rejected moves to Needs attention.

## Part 3: Stock page tabs must switch like the sidebar

All Items, Running Low and Out Of Stock currently remount or refetch the page. Make them an in-page filter:
- Use the same sliding-pill component as the navigation for the segmented control.
- Filter the already-loaded list in memory (derive from the cached `items` query; no navigation, no new request, no skeleton). If the filter is kept in the URL, use `history.replaceState` or `useSearchParams` with `router.replace(..., {scroll:false})` in a way that does not re-run the server component or `loading.tsx`.
- Keep the table frame and header mounted. Animate rows with a short crossfade of 120 ms (opacity only), no layout jump: reserve the list height while swapping (`min-height`) and keep the scroll position.
- Same behaviour for the search box (debounced 100 ms, no flicker) and for any other segmented control or tabs in the app (Reports ranges, Debts filters, Sell modes Tap, Speak, Snap, Type).
- Test: blank-frame style sampler during a filter switch: zero frames where the list container is empty or the page skeleton appears, and the sliding pill moves with `transform`.

## Part 4: Sell tab, select and deselect many items

On Sell (Tap mode) change the interaction:
- Tapping a tile **selects** it (check icon, green border, quantity 1). Tapping a selected tile again increments? No: use this exact behaviour: first tap selects with quantity 1; a quantity stepper (minus, plus) appears on the selected tile; minus at 1 **deselects**; tapping the check icon or long-press also deselects. Selected tiles are highlighted without using colour alone (check icon plus border).
- A sticky summary bar at the bottom (above the mobile tab bar, safe-area aware): "3 items, ₦1,450", **Clear** (deselect all), and a primary **Record sale**. It slides up once when the first item is selected and slides away when none are selected.
- **Record sale** opens a small sheet: payment (Cash, Transfer, Credit with customer picker), line list with editable quantity and price, total, confirm. One confirm creates one batch via `commit_entries`; Undo toast afterwards (existing).
- Out-of-stock tiles are disabled (Part 2). Items without a price show "Set price" and open the price sheet first.
- Keyboard: Space or Enter toggles, arrow keys move; `aria-pressed` on tiles; announce the total with `aria-live="polite"`.
- Home Quick Sell tiles keep their one-tap behaviour (with Undo); say so in the UI by a different affordance (a plus button) so the two do not feel inconsistent.
- Test: select 3, deselect 1, change a quantity, record; assert one batch, correct totals, stock reduced, dashboard revenue and sales count updated (Part 1).

## Part 5: cleaner dropdowns

The Settings currency list is the browser's native `<select>` list (plain white-on-blue). Replace **every** native `<select>` in the app with the shadcn `Select` (Radix) styled with the app tokens: same height and radius as inputs, dark and light themes, check mark on the selected option, visible focus ring, keyboard and screen-reader support. On phones, render the list as a bottom sheet (vaul Drawer) with large rows. Long lists (timezone, categories, customers, items) use a searchable Combobox (cmdk). List every replaced select in the report. Test: at 360 px and 1280 px, open each dropdown, pick an option with keyboard and with pointer, assert the value changed and the list is not clipped by the viewport.

## Part 6: pull to refresh in the installed app, with the logo as the spinner

- Only when running standalone (`display-mode: standalone` or `navigator.standalone`) on touch devices. In the normal browser tab leave the browser's own refresh alone.
- At scroll top, dragging down pulls the **tally logo** into view: as the finger pulls (0 to 72 px) the four strokes draw in one by one and the amber slash appears at the threshold (progress follows the finger, using `transform` and `opacity` only). Past the threshold, release triggers refresh: the logo plays the existing splash loop (the pulsing amber slash) while queries refetch (`dashboard`, `checklist`, `items`, current page queries, queue flush). When done, it plays a 200 ms finish (slash strikes through) and collapses. Minimum visible time 400 ms so it does not flicker. If offline, show a short "You're offline" message instead of spinning forever; 8 s cap.
- Implementation: a `PullToRefresh` wrapper around the scroll container in the app shell. Touch handlers, `overscroll-behavior-y: contain` on the scroller, resistance curve (pull distance is about 0.5 of finger distance), no interference with horizontal scroll, nested scrollers, open Drawers or dialogs. Reduced motion: no drawing animation, a static logo and a thin progress line.
- Test with Playwright touch emulation in standalone mode: drag below threshold springs back with no refetch; drag past threshold triggers exactly one refetch of the dashboard query; no trigger when the page is scrolled down; no trigger while a drawer is open.

## Part 7: Home header

- Replace "Shop Dashboard" with a personal greeting: **"Good morning, Chinemerem"** (first name from the profile; time-of-day greeting from the shop timezone), and beneath it the shop name and date: "Random · Mon, 23 Nov". If the profile has no name, use the shop name; never show "Shop Dashboard" again.
- Remove "Updated 0m ago". On desktop keep a small icon-only refresh button with a tooltip; on the installed phone app rely on pull to refresh (no icon).
- Update the page `<title>` and tests that look for "Shop Dashboard".

## Part 8: reasons and an activity log for stock adjustments

In the Adjust Stock dialog:
- Replace the free-text-only reason with **reason chips** (single select): Sold, Purchased, Expired, Damaged, Returned, Counted (stock take), Other. A chip is required; an optional note field stays for extra detail ("Other" requires a note).
- Show the before and after and the difference ("75 → 70, -5"), preventing negative results (Part 2).
- The chip changes the effect: **Purchased** goes through the Purchases flow (Part 9) so cost is kept; **Sold** offers "Also record this as a sale at ₦X" (default on) so revenue stays correct, otherwise it is a quantity-only correction; the others are quantity-only adjustments.
- **Log:** every adjustment is stored in the ledger as an `adjustment` entry with item, before, after, delta, reason, note, user and time. Add a visible **Stock history**: per-item (on `/stock/[itemId]`, a timeline) and a shop-wide **Activity** list on the Stock page (a third segment next to Items and Purchases, see Part 9) with filters by reason and date range, newest first, each row "Bottled Water 75cl: 75 to 70 (-5), Expired, 23 Nov 09:41". Entries can be voided where that makes sense (existing void behaviour); voiding restores stock and is shown in the log.
- Migration if needed (idempotent file, with numbered steps for the Supabase SQL Editor for me), RLS so users see only their own rows. Tests: DB integration (adjustment writes a ledger row with reason, before and after; user B cannot read user A's), E2E (adjust with a chip, see it in the history instantly).

## Part 9: Purchases (buying stock in packs, boxes, cartons)

There is no place to record buying stock. Add it under **Stock** as a segmented control **Items, Purchases, Activity** (do not add a sixth bottom tab; the mobile bar stays at five). A **Record purchase** primary button appears on Stock, in the Home checklist, and in the command menu.
- **Purchase form (drawer):** supplier (optional, free text with recent suggestions), date (default today), then one or more lines: item (searchable), **pack type** (piece, pack, carton, bag, crate, dozen, custom), **number of packs**, **units per pack** (for example 1 carton = 40 packs; remembered per item after first use), **cost per pack**, total cost shown. The form shows the conversion live: "2 cartons x 40 = 80 packs added". Option "Update the item's cost price from this purchase" (default on) and a hint for selling price based on cost plus the shop's usual margin (never auto-applied).
- Saving creates `restock` entries through `commit_entries` (idempotent, one batch), increases stock in base units, stores pack type, packs, units per pack, cost, supplier; Undo toast.
- **Purchases list:** grouped by day, total spend per day, supplier, lines, with void. Weekly and monthly **spend** appears in Reports and in the weekly narrative inputs (only real numbers).
- Item settings gain optional "Usual pack: carton of 40" so restocking is one tap.
- Migration for the new columns (idempotent). Tests: unit conversion maths (packs x units), DB (stock increases exactly by packs x units, cost stored as integer minor units, void restores), E2E (record a 2-carton purchase and see stock, the purchases list, the activity log and the reports spend update without reload).

## Part 10: prices (and the evidence problem)

**First, a correction I need you to answer plainly.** Your Round 6 transcript shows 9 web searches (result titles only, no pages opened) and then "Created generate-price-evidence.mjs", after which the report claims "75 individual evidence snippets with source URLs, benchmark prices and capture dates". Evidence generated by a script is not evidence. It breaks the rule I gave you (never invent a price, every source URL must be a page you opened). Answer: did you open any of the pages? Which? Delete `docs/price-evidence/` and `scripts/generate-price-evidence.mjs`, and revert any price whose only support was a generated snippet. Also: `supabase/seed_prices.sql` is described as `UPDATE items ... WHERE category AND name`. It should update **`catalog_items`** (the reference table); updating `items` rewrites users' own rows. Paste the file head and fix it.

**Second, the symptom.** On my account almost every item is exactly ₦100, with Indomie Chicken at ₦1,000. Find where ₦100 comes from (a default in the price sheet, a backfill, a fallback in `catalog.data.ts`, the "Confirm all" flow) and explain it with the code line. A flat ₦100 is worse than empty because it looks like a real price.

**Third, the fix, honest and workable:**
1. Use WebFetch to open real product pages (Jumia Nigeria, Supermart.ng, Konga, Shoprite Nigeria and similar) and the NBS price watch PDF for staples. For each row where you opened a page, save the raw lines you read (the product title and price text exactly as shown), the URL and access date in `docs/price-evidence/<slug>.md`. Written by you from what you read, never generated by a script. Example of the real data shape: Jumia lists "Indomie REGULA CHICKEN 70G - 1 Carton" at ₦10,470, which is a carton of 40, so the per-pack price is 10,470 / 40 = ₦262, and the same page lists "Indomie Instant Noodles Chicken 70 g x40" at ₦25,900. Prices on these sites vary a lot between listings; record the range and use a documented rule (for example the median of listings you opened, then add the shop's usual retail mark-up as a separate, stated assumption).
2. If you cannot open pages (fetch blocked or not available), **say so**. Do not fall back to generating numbers. In that case ship only what you really sourced, and make the owner-side flow strong instead: (a) a **Set all prices** screen (`/stock/prices`) with a fast keyboard flow that shows the item name, unit, and the cost price if known, sorted with unpriced first; (b) when an item has a recent purchase (Part 9) suggest a selling price = cost per unit x (1 + the shop's usual margin, default shown and editable) so after the first purchase the price is derived from real money the owner paid; (c) rows with no source show "Set price", never a number.
3. Tiers stay: `high` (opened page for the exact pack), `medium` (documented conversion from an opened source), `low` (category benchmark, labelled "Rough estimate"). A row with no opened source is `none` and stays empty. Report counts per tier and the number of pages you actually opened; show 10 random rows with the evidence file content.
4. Provide the SQL steps for me (paste into the Supabase SQL Editor): a corrected `seed_prices.sql` for `catalog_items`, and a backfill that sets prices for existing users' items **only where the price is null or 0 or exactly the placeholder value you identify and the source is not `'user'`**. Never overwrite a price the user typed.

## Part 11: carry-overs (answer each, do not skip)

1. **4x CPU frame times.** You report 28.8% of frames over 33 ms and a 1,433 ms frame during hydration (target was at most 2 frames over 33 ms). Find what runs in the first two seconds (hydration size, IndexedDB persister restore, service-worker registration, font loading, large client bundles on `/home`) with a trace, and reduce it: code-split heavy client components, defer the persister restore until idle, avoid hydrating hidden sections. Report before and after.
2. **Dev "1 Issue".** Your explanation is still a guess. Paste the actual indicator message from a clean browser profile in dev, and the fix.
3. **Gemini grounding.** Your Round 6 numbers (5,000 free requests per month, $14 per 1,000) came from two searches that returned only titles. Paste the exact sentence and URL from the official page you opened, or write "unverified".
4. **Round 6 `/reports` root cause.** Your trace names `computeInventoryInsights (lib/domain/insights.ts:42:31)` and `item.velocityUnitsPerDay` undefined. Add a regression test using that exact data shape and show it failing on the old code (use `git stash` or a checkout of the previous commit) and passing now.
5. **Full suite.** Last round you ran targeted specs only. This round run the **full** `pnpm test:e2e` on the production build and paste the final summary lines. List every test that failed at any point and why.
6. **No badges.** Your Round 6 text says "high-visibility badge: Fix stock". My rules allow only Low, Out, Owes, Offline, Syncing as badges. Confirm none were added.
7. **Repo hygiene.** `ROUND6_PROMPT.md` is untracked at the root again. Move prompts to `docs/prompts/` and commit them, or add them to `.gitignore`.

## Final report (required)

1. For Parts 1 to 4: the reproduction (what I would see), the root cause with evidence (DB rows, API responses), the fix, and the before/after test output.
2. The mutation map table (mutation to query keys) and the audit table for Part 1 item 4.
3. Part 10: pages actually opened (list), tier counts, what is still empty, the origin of ₦100, the SQL steps for me.
4. Screenshots and short recordings (file paths): Home header, Stock filter switch, Sell multi-select with the summary bar, a dropdown, pull to refresh, adjust stock with chips, stock history, purchase form and list.
5. SQL files to run (names, order, numbered steps for the SQL Editor).
6. Raw summaries of `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, full `pnpm test:e2e` (passed, failed, flaky, skipped), every test edited and why, `git log --oneline -20`, `git status`, and a requirement table (done, partly, not done, unverified).
