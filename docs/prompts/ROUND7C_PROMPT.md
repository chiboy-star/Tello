# Tallo: Round 7c (remove the test masking, finish the proof, honest prices)

Same rules as before: raw output, no loosened assertions, "not done" where not done, small commits, no push. Credit where due: you reported zero pages fetched, deleted the unbacked evidence files and limited the price backfill. The items below are what is still wrong or unproven.

## 1. A test was changed to hide the bug I reported

Your report says `tests/e2e/checklist.spec.ts` now calls `refetchQueries({ queryKey: ['dashboard'] })` on its setup steps "because Home is now driven by `dashData?.checklist`". That is the exact behaviour I complained about: the checklist and dashboard numbers did not update on their own after a sale, a customer or a price change. A test that refetches manually proves nothing about automatic updates. You also wrote "Zero assertions loosened" about this file, which is not accurate.

Fix:
1. Revert that change. The checklist and dashboard specs must perform each action **through the UI only** (add item, record sale on Sell, add customer, confirm prices, voice or photo entry), then assert the dashboard numbers and the checklist change **without** any manual refetch, reload or `evaluate` call into the query client. If the test fails, fix the app, not the test.
2. Add the same test for: Today's Revenue, Sales Count and Credit Given after a cash sale and a credit sale from `/sell`; after Quick Sell on Home; after Undo; after a debt payment. Assert numbers within 300 ms of the action finishing.
3. Search all specs for other `refetchQueries`, `invalidateQueries`, `__REACT_QUERY_CLIENT__`, `reload()` or `waitForTimeout` calls that were added to make a test pass, list each with the reason, and remove the ones that mask real behaviour.

## 2. The A1 evidence was a simulation, not my flow

The "DB rows" and JSON in A1 show shop "Tallo Provisions" and owner "Chiboy Store" and sale totals of 26,000, 30,000 and 35,000 minor. My account is "Madueke Chinemerem", shop "Random". Your transcript shows a "dashboard simulation script". Say plainly whether those rows came from a real UI session or a script. Then do it for real: in a production build, as a freshly signed-up user, make three sales through the UI (one tap-sale on Sell, one Quick Sell on Home, one credit sale to a customer), and paste (a) the actual rows from `entries` for that user, (b) the `/api/dashboard` response, (c) a screenshot of Home. Also show the same flow failing on commit `6ff735b` (checkout in a scratch worktree), or say you could not reproduce it there.

## 3. Prices: the report overstates what was verified

You opened zero pages, yet the report headline says "Verified Single Benchmark Prices" and the evidence files quote "Supermart.ng: Pack of 12 @ ₦1,500" for Gala and "Pack of 12 Eva 75cl @ ₦3,640" for Eva. With no page opened and search results that return only titles, where did those numbers come from? Also the Indomie figures (₦10,470 carton, ₦25,900 listing) are the example I wrote in my prompt, and "reseller mark-up" is your explanation, not something a page said. Also, Round 7 listed Indomie at ₦200, Gala ₦250, Eva ₦250 and now they are ₦260, ₦150 and ₦350, with no new source.

Required:
1. For each of the three rows, state exactly where each number came from (a page you read, my prompt, memory). If it was memory or my prompt, label the evidence file "unverified" and set tier to `low`.
2. Do not call anything verified without an opened page. Rename the heading. `supabase/backfill_item_prices.sql` keeps only values with a real source; the rest stay empty.
3. "Retail = wholesale unit price" is wrong for a shop's selling price. Do not use a carton or pack-of-12 price as a selling price. If you convert, state the shop margin assumption separately and show it as a separate field, not inside "benchmark".
4. Grounding: the quote from `ai.google.dev/pricing` appeared with no fetch in the transcript. Paste the fetch output, or write "unverified" and remove the quote.
5. I will supply a sourced price table for the catalog that I research myself. Build the import so it accepts a CSV (`category, name, unit, price_ngn, source_url, source_text, accessed, tier`), validates it, rejects rows without a URL or with a missing tier, writes `catalog_items` and the evidence markdown from the CSV, and is idempotent. Provide the script and a 3-row example CSV. Do not fill the CSV yourself.

## 4. Missing proof (answer each)

1. **Final E2E summary.** Your report shows lint, typecheck, unit tests and build, but no final result for `pnpm test:e2e`, even though the transcript shows the run exited with code 1 and several tests were edited afterwards. Paste the final summary of one complete, uninterrupted `pnpm test:e2e` on the production build for the final commit (passed, failed, flaky, skipped) and list every test that failed at any point.
2. **Parts 8 and 9 screenshots.** Provide screenshots (file paths) of: the Adjust Stock dialog with reason chips and the before/after line; the Activity list; the per-item history; the Purchase drawer with the live conversion; the Purchases list. At 390 px and 1280 px.
3. **Pull to refresh.** One screenshot is not enough: give a frame strip (progress at 0, 30, 60, 72 px, refreshing, finishing) and say how the logo behaves while refreshing.
4. **4x CPU frame times got worse**: 27 of 165 frames over 33 ms, max 1,866 ms (last round 1,433 ms; the target was at most 2 frames over 33 ms). Take a Chrome trace of `/home` load under 4x throttling, name the top three long tasks (hydration, persister restore, service-worker registration, fonts, bundle size), and fix at least the first two. Report before and after.
5. **"1 Issue".** Your A10 answer does not give the message. Open the dev indicator in a clean browser profile and paste its exact text. If it is a real warning in the app, fix it.
6. **Old install component.** Your grep still lists `components/install-prompt.tsx` next to `components/install-provider.tsx`. Round 4 said to replace the first with the second. Confirm only one install banner can ever render, or delete the old file.
7. **Copied sections.** Sections 3, 4 and 6 of your report (colour tokens, DESIGN.md 7.x, animation grep) repeat an earlier round and have nothing to do with this one. Leave out sections that are not asked for.
8. **The migration changed.** Your transcript edits `20261123000000_stock_rules_and_purchases.sql` twice during this round. State what changed, so I know whether I need to run it again, and confirm it is safe to run twice on a database that already has the earlier version.

## 5. Final report

Items 1 to 4 with evidence, raw summaries (lint, typecheck, unit, build, full E2E), `git log --oneline -15`, `git status`, and which SQL files I run in the Supabase SQL Editor for an **existing** project, in order (not the fresh-project list).
