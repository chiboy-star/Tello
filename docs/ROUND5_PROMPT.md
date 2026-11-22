# Tallo: Round 5 (production CSS bug, app name, splash loop and smoothness, report corrections)

Same rules as before: raw command output, no loosened assertions (list every test edit), "not done" where not done, small Conventional Commits. Do not push. I will push myself after you report.

## Part 1: deployed site has no styling (do this first)

On `https://tello-iota.vercel.app` the landing page renders as unstyled HTML: huge Lucide icons, plain left-aligned text, default fonts, no layout. The JavaScript works (the Install button appears in Chrome's address bar and the page content renders), so the HTML and JS load but the stylesheet does not apply. It works locally.

Diagnose, do not guess. Work out which of these it is, with evidence for each:
1. The CSS file request fails or returns HTML. Check `proxy.ts` matcher: `/_next/static/*`, `/_next/image`, `/icons/*`, `/manifest.webmanifest`, `/sw.js`, fonts and images must be excluded so they are never redirected to `/login`. Run `pnpm build && pnpm start`, then `curl -I` every `<link rel="stylesheet">` href in the served HTML and paste the status and `content-type` of each. Do it logged out.
2. A stale or wrong service worker (Serwist) precache or runtime cache serving an old or missing CSS hash after a deploy. Check `app/sw.ts` and `scripts/clean-sw.mjs`.
3. Tailwind or lightningcss not producing output in the Vercel (Linux) build. Open the built `.next/static/css/*.css` and confirm it contains the Tailwind utilities (for example `.flex`, `.grid`, token variables) and is not near-empty. Check `postcss.config`, the `@import "tailwindcss"` and `@source` setup in `app/globals.css`, and `pnpm-lock.yaml` platform binaries. Check for a `--webpack` versus Turbopack difference in CSS handling.
4. A CSP or security header in `next.config.ts` blocking styles, or a wrong `assetPrefix` or `basePath`.
5. `app/layout.tsx` inline critical `<style>` or the new splash CSS breaking the cascade, or the stylesheet being removed by a script.

Reproduce it locally by running the production build with a fresh browser profile (no service worker, no cache), logged out. If it only happens on Vercel, say what differs (env vars, Node version, headers, `vercel.json`) and add a regression test for the cause (for example a test that every stylesheet link in the SSR HTML returns 200 with `text/css` for an unauthenticated request, and a check that the built CSS contains known utility classes).

Fix it, then tell me exactly what to redeploy or clear. If users who already visited have a bad cached service worker, add a safe cleanup (bump the SW version, `skipWaiting`, `clientsClaim`, and delete old caches on activate). Add a "Deployment checklist" section to the README: Vercel env vars needed, Supabase Auth Site URL and Redirect URLs set to the Vercel domain, running the SQL migrations, and how to verify the deployment in 2 minutes.

## Part 2: installed app name must be exactly "Tallo"

The installed icon and window label read "Tallo — Sales & Stock Tra…". In `app/manifest.ts` set `name: "Tallo"` and `short_name: "Tallo"`. The description can keep the longer text. Also check `appleWebApp.title`, the `application-name` meta and any shortcut names. Keep the `<title>` as "Tallo" on app pages (the landing page can keep "Tallo: Know your shop"). Existing installs keep the old cached name, so say in the report that I must uninstall and reinstall to see it. Add a test that the manifest `name` and `short_name` equal "Tallo".

## Part 3: splash animation, smoothness and a loop while the app is not ready

1. **Loop while not ready.** After the intro choreography finishes (block stack, slash, rotate upright, wordmark in), if the app is not ready yet, the splash must not disappear or freeze. It enters a seamless loading loop: logo upright and static, with a subtle repeating motion on the amber slash (a short shimmer or soft pulse, 1.2 s cycle, transform and opacity only), until the ready signal. Define "ready" precisely: React hydrated, the auth/session check resolved, and the first route's skeleton or content mounted. When ready, the splash fades out over 200 ms (never cut mid-frame). Safety cap: if not ready after 8 s, fade the splash out anyway and show the skeleton, and log a console warning. Loops are allowed only here, consistent with DESIGN.md (loading states only), and reduced motion gets a static logo with no loop.
2. **Minimum and maximum time.** The intro plays in full at least once (about 1.9 s web, about 1.1 s PWA) even if the app is ready sooner, and never exceeds the 8 s cap.
3. **Smoothness audit.** Measure, do not assert. In Chromium via Playwright with CDP tracing or an in-page rAF sampler, record frame deltas during the whole splash for: desktop with no throttle; mobile emulation with 4x CPU throttle; mobile with 6x CPU throttle plus Slow 4G. Report p50, p95 and max frame time and the count of frames over 20 ms and over 33 ms for each. Target: at most 2 frames over 33 ms at 4x throttle. Rules to meet it: animate only `transform` and `opacity`, no `filter` or `box-shadow` animation, no layout-affecting properties, `will-change: transform, opacity` only on the animating layers and removed afterwards, the SVG pre-rendered inline in SSR (no image decode during animation), no JS timers driving the choreography (CSS keyframes or the Web Animations API only), and no hydration work scheduled during the first 600 ms if avoidable. If a number misses the target, fix the cause and re-measure; show before and after.
4. **Seams.** Check the handoff between choreography end and loop start (no jump, no restart of the stack), and between loop and fade-out (no flash of unstyled or blank page). Provide a frame strip at 0, 500, 1000, 1500, 2000, 3000, 5000 ms with the app artificially delayed 5 s (`page.route` on the first `/api/**` and the session call), plus a short recording. Add tests: delayed app keeps the splash visible and looping; the splash is gone by 8.5 s in the worst case; a fast app still shows the full intro once.

## Part 4: corrections to your Round 4 report (answer each one)

1. **Prices.** You report 75 of 75 priced with 56 high and 19 medium confidence, 0 null, 0 low, but your transcript shows only about three web searches. Prove it: for every catalog row, `docs/PRICE_SOURCES.md` must list a real URL that you actually opened. Mentions of "Mile 12 Lagos, Bodija Ibadan and Wuse Abuja price logs, November 2026" must be backed by a URL, otherwise remove them. My rule was: never invent a price; unknown means null. For any row where you did not open a real source, set the price to null, confidence to none, and say so. Rows where the price is a judgement (for example unit conversion of kg to derica) are "low", not "high". Then give an honest recount: how many rows have a real opened source, how many are judgement, how many are null. Show 5 randomly chosen rows with the source text that supports the price.
2. **Gemini Search grounding.** You say it is not available on the free tier and calls fail with an authorization error. You made one web search and did not test a call. Paste the exact Google documentation URL and the sentence that says it, with the access date. If you cannot, say "unverified" and I will decide whether to build the optional refresh script.
3. **Migration filename.** Your transcript created `20261121000001_catalog_prices.sql` but the report lists `20261122000000_catalog_prices.sql`. State which file exists in `supabase/migrations/` (paste `ls`), delete any duplicate, and confirm the file is idempotent (run it twice against a scratch database and paste both outputs). Also confirm that `seed_prices.sql` only references rows that exist.
4. **Root causes.** Your report must say, with evidence, what caused the blank main area and the "1 Issue" dev indicator. Paste the exact indicator message and the fix. If a fix is only in the test and not in the app, say so.
5. **Timing floor.** The ~100 to 130 ms floor: paste the raw 20-sample arrays per tab and the real cause you found, or "not found".
6. **Final suite.** Paste the final raw summary lines of `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` for the final commit (counts of passed, failed, flaky, skipped). Your log shows runs that were cancelled, killed and re-run; list every test that failed at any point and what changed to make it pass, to show nothing was loosened to pass.
7. **Git hygiene.** `ROUND4_PROMPT.md` is still untracked at the repo root while you said you committed a copy to `docs/`. Remove the duplicate. Paste `git ls-files | grep -iE "\.env|secret|key"` to show no secrets are tracked, and confirm `.env.local` is in `.gitignore`. Confirm `README.md` and `docs/` reference the product as "Tallo" (the remote repo is named "Tello"; mention it so I can rename it on GitHub).

## Final report format

1. Part 1: the root cause with the curl output or built CSS evidence, the fix, the regression test, what I must redeploy.
2. Part 2: manifest diff and the test.
3. Part 3: the frame-time table (before and after), frame strips and recording paths, the ready-signal definition.
4. Part 4: item-by-item answers.
5. Raw suite summaries, test edits table, `git log --oneline -15`, `git status`.
6. A requirement table: done, partly, not done, unverified.
