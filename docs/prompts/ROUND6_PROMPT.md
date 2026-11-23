# Tallo: Round 6 (mobile UI bugs, checklist, error handling, default prices)

Same rules as before: raw command output, no loosened assertions (list every test edit and why), "not done" where not done, small Conventional Commits, no push. The Round 5 CSS fix works on the deployed site, so this round is about what I saw on my phone (Android Chrome, 360 to 390 px wide, installed PWA and browser) and on desktop. Screenshots are in the chat I sent you; the observations below are what they show.

Standing rule for this round: **every UI bug gets a test that fails before the fix and passes after**, run at phone width (360x740 and 390x844) and desktop (1280x800). Previous rounds reported green E2E while these bugs shipped, so tests that only check "element visible" are not enough. Use bounding boxes and pixel geometry.

---

## Part 1: password eye icon is in the wrong place (login and signup)

On `/login` and `/signup` the show/hide eye icon renders **below and to the left of** the password input (outside the field, at the left edge of the card), instead of inside the field at the right end. It looks like the button lost its absolute positioning or the wrapper is missing `relative`. Fix it in the shared component (one `PasswordInput`, used by login, signup, reset password and anywhere else). Requirements:
- The button sits inside the input's box, vertically centred, 12 px from the right edge. The input has right padding so text never runs under it.
- Touch target at least 44x44 px, `aria-label` "Show password" / "Hide password", `aria-pressed`, keyboard operable, `type=button` so it never submits the form.
- On the login form the "Forgot password?" link stays on the label row.
- Test: at 360 px and 1280 px on `/login`, `/signup` and the reset-password page, assert the eye button's bounding box is fully inside the password input's bounding box, right-aligned, and that clicking it toggles `type` between `password` and `text`. Fail the test if the button is outside the input.
- Search the whole app for other copies of this pattern and fix them all.

## Part 2: bottom navigation highlight is on the wrong place

On the mobile bottom bar with Home as the active tab, the green highlight pill is drawn **behind the raised Sell button** (about x = 375 of 720, partly hidden under the circle) and nothing highlights Home. The sliding pill measures the wrong element or position, probably because Sell is a raised circular action with a different width, or because the pill's offset is computed before layout or fonts settle.

Fix:
- The active highlight must sit on the active tab and nowhere else. For Home, Stock, Debts, Reports use a pill behind the icon and label (or a top indicator bar) aligned to that tab's own box.
- Sell is a raised primary action. When Sell is active, do not draw a pill under it; instead mark it active by a ring or a darker fill and its label colour. Do not show any pill on the other tabs at that moment.
- The pill position must be derived from the active item's `getBoundingClientRect()` relative to the nav container, recomputed on: mount, route change, `pointerdown` (pending target), window resize, orientation change, font load (`document.fonts.ready`) and `ResizeObserver` on the container. Use `useLayoutEffect` so there is no first-paint jump. Use `transform: translateX()` and width, not `left`.
- It must be correct on first paint on a hard load of each route (no pill starting at x = 0 and sliding), correct in standalone mode, and correct at 360, 390 and 430 px.
- Desktop sidebar: same check for its pill.
- Test: for each tab and each viewport, load the route directly, then assert the highlight's centre x is within 2 px of the active item's centre x, and the highlight does not overlap any other tab's centre. Also click through all 5 tabs in sequence and assert after each transition. Add a screenshot per tab at 390 px to `tests/screenshots/nav-*.png`.

## Part 3: the Getting Started checklist is never updated

Home shows "Getting Started Checklist 2/5" with "Add at least 5 items" and "Review your prices" ticked. But I have not reviewed my prices (tiles still say "Set price"), and "Log your first sale" and "Add a customer record" stay unticked even after I did them. The ticks are not driven by real data.

Fix: derive every checklist step from real state, never from a hand-set flag, and refresh it after every mutation.
- "Add at least 5 items": count of non-archived `items` >= 5.
- "Review your prices": true only when the shop has at least one priced item and **zero** items with `sell_price_source = 'estimate'` or missing price (that is, the user has confirmed or edited every price, or there is nothing left to review). If no items exist it is false.
- "Log your first sale": at least one non-voided `sale` entry exists.
- "Add a customer record": at least one customer exists.
- "Try voice or photo entry": at least one entry or parse request with source `voice` or `photo` exists (or an `ai_usage` row for those modes). Define it and keep it consistent.
- Compute them in one API/RPC call (`GET /api/checklist`, or fields on the existing dashboard query) so it is one source of truth, and invalidate that query key after: add item, bulk add, price change, confirm all, commit sale, void, add customer, parse success. Also refetch on window focus and on reconnect (offline queue flush).
- Completed steps collapse or move to the bottom; when all are done the card disappears (with an "all set" toast once, never again). A completed step stays completed unless the data says otherwise.
- Each step is a link to the place that completes it.
- Tests: unit test for the derivation with each combination; E2E that starts with a fresh user (0/5), then adds items, logs a sale, adds a customer, confirms prices, and asserts the count and each tick change without a manual reload.

Also report why "Review your prices" was ticked with unreviewed estimates (state the previous rule).

## Part 4: "This page couldn't load" on /reports, and proper error handling everywhere

On the deployed site, `/reports` shows a generic "This page couldn't load. Reload to try again, or go back." I have seen this many times. Two jobs:

**A. Find the real cause (do not just hide it).**
- Reproduce on a production build with a user who has real data (sales, debts, restocks, and a user with none). Run `next start`, open `/reports`, capture the console error, the failing network request (status and body) and the server log.
- Check the API behind reports: `GET /api/reports/...` and the weekly report generation: missing columns, division by zero, empty arrays, null price (now that prices can be null), negative stock, `Intl`/date edge cases around week boundaries in Africa/Lagos, a Gemini call failing or timing out without the template fallback, a Vercel function timeout (Hobby is short, about 10 s), and missing env vars on Vercel (compare `.env.example` with what the code reads; list every variable the production build needs and tell me which to set in Vercel).
- Paste the root cause with evidence. If it can only be reproduced with specific data, write a regression test with that data.

**B. A real error-handling layer.**
- `app/(app)/error.tsx` plus an `error.tsx` per route segment (`home`, `sell`, `stock`, `stock/[itemId]`, `stock/prices`, `debts`, `debts/[customerId]`, `reports`, `settings`) and `global-error.tsx`. They keep the app shell (sidebar and tab bar) visible when only the page fails.
- Error UI: Lucide icon, one clear sentence of what failed in plain words ("Reports could not be loaded"), a primary **Try again** (calls `reset()` and refetches queries), a secondary **Go to Home**, and a small "Details" disclosure with the error digest and message for support. Offline-aware: if `navigator.onLine` is false, say "You're offline. Showing saved data when available" and offer the cached data instead of an error.
- Data-level errors never take down a page. Each section on Reports, Home and Stock loads and fails independently with an inline retry card in that section's own space (the skeleton turns into "Could not load this section. Retry"). A failed AI narrative falls back to the template text silently. A null or missing price or cost renders as "—", never a crash.
- API: one error shape `{ error: { code, message } }` with correct status codes; no HTML error bodies; TanStack Query `retry` limited (2, exponential) and `onError` shows a toast only for user-triggered mutations. Log client errors to `console.error` with the route and query key (no PII).
- `not-found.tsx` (app and global) with the same style and a link home.
- Tests: E2E that forces a 500 on `/api/reports/**` and asserts the shell stays, the error card shows with working Try again, and that Try again succeeds after the route is un-blocked; same with a thrown render error in one section (use a test-only flag); offline test shows the offline message; a 404 route shows the not-found page.

## Part 5: many items still have no default price

You set 57 of 75 catalog prices to `null`, so most tiles show "Set price" and the shop owner still has to price everything by hand. That defeats the point. The rule "never invent" stays, but "no source" must not mean "no price". Do this properly and in volume. Last round only about five web searches were run for 75 rows, which is not enough research.

1. **Research every row.** Budget: at least one search or page fetch per catalog row (batch similar items), using several sources per row where possible: NBS Selected Food Prices Watch (monthly, for staples per kg, per litre, per piece), Jumia Nigeria, Supermart.ng, Konga, Shoprite Nigeria, Spar Nigeria, Pricepally, Chowdeck/Glovo store listings, manufacturers' price lists, and credible news price surveys. Use WebSearch and WebFetch. Record for each row: the exact URL you opened, access date, the price text as it appears, pack size and unit.
2. **Evidence is mandatory.** Create `docs/price-evidence/` with one short snippet file per source page (the relevant lines copied from the fetched page, with URL and date). `docs/PRICE_SOURCES.md` must reference the evidence file for each row. In the Round 5 report you gave "exact text" quotes for Indomie (pricepally) and Semovita (supermart.ng) although your transcript shows no search or fetch for them, and a quote about Gemini grounding that mentions Gemini 2.0 and 1.5. I cannot accept quotes without a fetched page behind them. For any quote you cannot back with an evidence file, delete it and the price confidence with it. State in the report which Round 5 rows and quotes were not backed by a fetched page.
3. **Three honest tiers, all of which produce a price** (so no row is left empty):
   - `high`: a retail or marketplace price for the exact pack, opened and recorded.
   - `medium`: a documented conversion from a sourced per-kg or per-litre price to the shop unit (derica, cup, tin, sachet) using a documented conversion table (`docs/UNIT_CONVERSIONS.md` with sources for derica weights per product), or a price for a close variant (different brand, same size).
   - `low`: a category benchmark: the median of similar sourced items in the same category and unit, with the method written down. Marked clearly in the UI as "Rough estimate" so the owner knows to check it.
   - A row may only be null if there is genuinely nothing comparable at all (name the row and why). Expect very few.
4. **Wholesale and unit rows** (carton, bag, crate) get their own price computed from a sourced retail price times the documented count, or sourced directly, never copied from the retail row.
5. **Ship it:** update `catalog.data.ts`, `supabase/seed_prices.sql` (idempotent `UPDATE ... WHERE category AND name`) and `ref_price_confidence` values `high | medium | low`. Give me numbered steps to run `seed_prices.sql` in the Supabase SQL Editor, and a **second idempotent SQL file** that backfills existing users' items that still have no price from the catalog estimate (only where `sell_price_source` is not `'user'` and the price is null or 0; never overwrite a user price). Confirm that my own account's tiles (Beans, Cabin, Coaster, Gala, Garri, Indomie variants, Knorr, Maggi, Minimie, Palm Oil, Pure Water, Rice, Salt, Sugar, Tom Tom, Tomato Paste, Vegetable Oil) get prices after running it.
6. **UI:** estimated prices show on tiles with a muted "est." marker (not a badge); tapping an estimate tile still sells at that price; the review screen `/stock/prices` shows tier text in muted type ("Rough estimate" for low). Sorting on the review screen puts low-confidence rows first.
7. **Report numbers honestly:** count of rows by tier and null, the average number of sources per row, and 10 random rows with their evidence file paths so I can spot-check.

Also while here: my Sell screen shows **"Beans (Oloyin) Stock: -3 derica"**. Negative stock should not be possible silently. Show a clear warning on the sale ("Only 0 left, sell anyway?"), allow it only with explicit confirmation, record that the item went negative, and show negative stock in the Running Low list with a "Fix stock" action. Report how it got to -3.

---

## Part 6: carry-overs from Round 5 you marked "DONE" that need a second look

1. **Smoothness target not met.** The 4x CPU throttle row shows p95 250 ms, max 1467 ms, 19 frames over 33 ms. The target was at most 2 frames over 33 ms. You marked it DONE. Find what runs during the first 2 seconds (hydration, SW registration, fonts, query persister restore from IndexedDB, large inline scripts) and fix it, or state what remains with numbers. Re-measure and show before and after.
2. **Tab timing samples** include 1720 ms, 937 ms, 928 ms and 507 ms outliers, and the stated cause of the earlier 100 to 130 ms floor (`startTransition` plus the 120 ms `.page-enter`) is a guess. Show what the outliers are (cold route compile, query waiting, GC) with a trace, or mark it unknown.
3. **"1 Issue" dev indicator.** You say it was a browser extension attribute. Prove it: paste the exact indicator message from a clean browser profile (no extensions) before and after your change.
4. **Gemini grounding.** Paste the real, current Google docs page text about Search grounding and free tier (fetch it with WebFetch; the model family in this project is Gemini 3, so a quote about 2.0 and 1.5 is not current evidence). If you cannot fetch it, write "unverified".
5. **Migration check.** You say the migration uses `ON CONFLICT (id) DO UPDATE`. The reference rows were meant to be updated with `UPDATE ... WHERE category AND name`. Paste the final SQL files and show a double-run on a scratch database with the output.

## Part 7: mobile visual QA (so this class of bug is caught)

Add `tests/e2e/mobile-layout.spec.ts` at 360x740 and 390x844, checking geometry on: `/login`, `/signup`, `/home`, `/sell`, `/stock`, `/debts`, `/reports`, `/settings`:
- no horizontal scroll (`scrollWidth <= clientWidth`);
- no element overlapping the bottom tab bar's tappable area unexpectedly; main content has bottom padding equal to the tab bar height plus safe area;
- every form control icon button sits inside its field;
- the active nav highlight matches the active tab;
- all tap targets at least 44x44 px;
- the raised Sell button does not cover the Debts or Stock labels.
Save screenshots to `tests/screenshots/mobile-*.png` and list them.

Also fix, if it is still there: the "Good evening" pill next to the "Shop Dashboard" title is a decorative badge. Remove it or make it plain text, per the no-useless-badges rule.

---

## Final report (required)

1. Per part: root cause (with evidence), the fix, the test that failed before and passed after (paste both outputs for Parts 1 to 4).
2. Part 4A: exact reason `/reports` failed, with console, network and server-log evidence, and the list of Vercel env vars I must set.
3. Part 5: tier counts, null rows with reasons, average sources per row, 10 random rows with evidence paths, the SQL steps, and which Round 5 quotes were not backed.
4. Screenshots: login, signup, nav at 390 px for each tab, checklist at three states, error card, prices review. Give file paths.
5. Raw summaries of `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` for the final commit (passed, failed, flaky, skipped) and every test you edited with the reason.
6. `git log --oneline -15`, `git status`, and a table of every requirement: done, partly, not done, unverified.
