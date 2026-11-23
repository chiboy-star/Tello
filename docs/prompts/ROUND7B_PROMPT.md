# Tallo: Round 7b (finish and prove Round 7)

Same rules: raw output, no loosened assertions, "not done" where not done, small commits, no push. Your Round 7 report covers Parts 1 to 4 and some SQL, and is silent on most of the rest. Do not re-implement what works; close the gaps below and prove each with output.

## A. Missing from the report (answer each: done, partly, not done, with file and evidence)

1. **Part 1 reproduction.** I asked for the real flow on a production build and the database rows. Paste them: the user's `entries` rows after 3 sales (type, voided, total, qty, created_at), the `/api/dashboard` JSON, and a before/after of what Home showed. Your stated cause (browser-local date filtering) does not explain my case, because my browser is already in Africa/Lagos and sales made today showed 0. State what actually produced 0 on my screen: price null at sale time (total 0)? the entries filter? stale cache? Show the failing behaviour on the **previous commit** (`git stash` or checkout `6ff735b`) and the fix on the current one.
2. **Part 1 audit table** lists 5 writes. The app has more: add customer, edit price, price confirm, items PATCH or archive, settings save, bulk add, purchases, restock. Give the full table (mutation, optimistic update, rollback on error, double-submit guard, invalidation) and one E2E per write that asserts the UI changes within 150 ms with no reload.
3. **Part 5 dropdowns:** list every native `<select>` you replaced and any that remain.
4. **Part 6 pull to refresh:** show the Playwright touch test (below threshold springs back, past threshold refetches exactly once, no trigger when scrolled or a drawer is open) and a short recording or frame strip of the logo drawing and the loop.
5. **Part 7 header:** screenshot of Home with "Good morning, <name>", shop name and date, no "Updated" text.
6. **Part 8 adjustments:** show the dialog with reason chips, the before/after line, the Activity list and the per-item history, and the DB test proving an adjustment writes before, after, delta, reason, note, user, time and that user B cannot read user A's rows.
7. **Part 9 purchases:** show the Purchase drawer (pack type, number of packs, units per pack, cost, live conversion), the purchases list and the Reports spend line, and the test for packs x units = stock increase, cost in integer minor units, void restores stock. Say where Purchases lives in the UI (it should be Stock: Items, Purchases, Activity).
8. **New tables and functions:** `purchases`, `stock_activity` and the changed RPCs need RLS and `security definer` review. Paste the policies, and an integration test that user B cannot select, insert or update user A's rows in each new table, and that a double-run of the migration is clean.
9. **Part 2:** the concurrency test (two parallel sales of the last unit, exactly one succeeds) and the offline "Needs attention" test output.
10. **Part 11 carry-overs:** 4x CPU frame times before and after with a trace (hydration, persister restore, SW registration, fonts), the real "1 Issue" message from a clean profile, no new badges, prompts moved out of the repo root.

## B. The full suite

Your "Full E2E" section lists 3 spec files (22 tests). Run the **entire** `pnpm test:e2e` on the production build and paste the final summary (passed, failed, flaky, skipped). List every test that failed at any point and what changed.

## C. Prices, again (this is the second time this part came back unsupported)

Your transcript shows 7 searches, result titles only, and no page opened. The report then lists six rows with **ranges** and sources like "Supermart.ng / NBS Food Watch", "Lagos kiosks" and "Retail kiosks", and a line "(₦150 carton rate)" that does not make sense. A kiosk is not a source, and a range is not a price. The same report also says the ₦100 values were a prototype placeholder, while your Round 6 report said all 75 had been researched. Both cannot be true.

Required:
1. State how many product pages you actually opened with WebFetch, and list the URLs. If the answer is zero, say "zero".
2. `supabase/backfill_item_prices.sql` currently sets prices that are not backed by an opened page. **Do not ship it as is.** Rewrite it so it only contains prices with an evidence file written from a page you opened (title and price text copied exactly, URL, date). Everything else stays null (shown as "Set price").
3. Remove "kiosk", "market" and range values from the data. One number per row, tier `high | medium | low | none`, with the rule used for conversion (for example carton price divided by pack count) written in the evidence file.
4. Use WebFetch on Jumia Nigeria, Supermart.ng, Konga and NBS PDFs. Example of what a real page gives: Jumia lists "Indomie REGULA CHICKEN 70G - 1 Carton" at ₦10,470 and "Indomie Instant Noodles Chicken 70 g x40" at ₦25,900. Those two disagree by more than 2x, so record both and say which you used and why. If fetch is blocked for a site, write that and move on.
5. If you cannot open enough pages, say so. The owner-side fallback stays: unpriced rows show "Set price", the review screen orders unpriced first, and after a purchase is recorded the app suggests a selling price from the real cost plus the shop's margin.
6. Gemini grounding: you quoted Vertex AI documentation. This project calls the Gemini API from Google AI Studio, which is a different product with different pricing. Paste the exact sentence and URL from the **Gemini API** pricing or grounding page you opened (ai.google.dev), or write "unverified".

## D. Final report

Per item A1 to A10, B and C: status, file, evidence. Raw summaries of lint, typecheck, unit tests, build and the full E2E run. Screenshots with file paths. `git log --oneline -15`, `git status`, and the exact list and order of SQL files I must run in the Supabase SQL Editor (the price backfill only after C is done).
