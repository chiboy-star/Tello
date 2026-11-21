# Tallo — Round 3: intro animation, PWA entry, instant navigation, local git

Same rules as before. Paste raw command output, never reuse old numbers, never loosen an assertion (list every test file you edit and why), report every deviation, and write "not done" for anything you did not do. Do not add paid services. Do not add an animation library (framer-motion etc.); use CSS and the Web Animations API. Run everything against the **production build** (`next build --webpack` then `next start`) for anything about speed or the PWA, because dev mode is not representative.

---

## Part 0: leftovers from the design report (do these first)

1. `components/install-prompt.tsx` uses `bg-white`, `shadow-xl`, `rounded-xl`. That breaks dark mode and the radius and shadow rules. Fix it. Then grep the whole app for hardcoded colors (`bg-white`, `text-black`, hex values outside `globals.css`) and for `shadow-lg|shadow-xl|rounded-2xl|rounded-xl`, and replace them with tokens. Show the grep output before and after.
2. The contrast table in your last report listed ratios that were never computed in your log. Write a small script that computes WCAG contrast for the token pairs in both themes, run it, and paste the output. Remove any number you cannot show.
3. Your BlurHash note mentions "lightweight WebP mockup assets". No such assets exist yet. Correct that line.
4. `react-hooks/set-state-in-effect` is turned off in `eslint.config.mjs`. That rule flags the pattern "fetch in useEffect, then setState", which causes a blank flash and a pop-in on every page. List every place where this pattern is used. Part 3 will replace them.

---

## Part 1: intro animation and PWA loading banner

Build one component, `BrandSplash`, used in two situations:
- **First visit ever to the website** (flag `localStorage["tallo.intro.v1"]`). Plays once, then never again on that device.
- **Every cold launch of the installed PWA** (`display-mode: standalone` or `navigator.standalone`). It acts as the loading banner. It does not replay on in-app navigation or on a refresh within the same session (use `sessionStorage`).

Do not show it on ordinary web visits after the first one.

### Choreography (full version, about 1.9s total)
The final frame must be exactly the logo in `public/icons/icon.svg`: a green squircle with four white vertical strokes and the amber diagonal strike, next to the wordmark. Work backwards: the start geometry is the final logo rotated -90° about its center.

| Time | What happens |
|---|---|
| 0 to 100ms | Green squircle fades and scales in (0.92 to 1). |
| 100 to 700ms | Four white blocks drop in one after another (about 120ms apart), landing **stacked horizontally** like bricks. Short ease-out, tiny settle. |
| 700 to 950ms | The amber strike **slashes** diagonally across the stack (stroke-dashoffset draw, 250ms). The stack nudges about 2px on impact. |
| 950 to 1350ms | The whole mark **rotates 90° and stands upright**, with a small overshoot (`cubic-bezier(0.34, 1.4, 0.64, 1)`). The blocks become the vertical tally strokes. |
| 1000 to 1500ms | While it stands up, the wordmark **slides in** (translateX -12px to 0, opacity 0 to 1) and the mark moves left to form a centered lockup. No layout shift. |
| 1500 to 1700ms | Hold the final frame. |
| 1700 to 1900ms | Fade out. |

- **PWA cold-launch version:** same sequence compressed to about 1.1s. Dismiss when the animation has finished **and** the session check has resolved. Hard cap 3s. If the app is still not ready after 2.5s, show a thin progress line (an allowed loop because it signals a pending state).
- **Skip:** any tap, click or key press jumps to the end (finish within 150ms). On first web visit only.
- **Reduced motion:** no movement. Show the final lockup for 400ms, then fade.
- **Brand name:** use a single `BRAND_NAME` constant (value `"Tallo"`) so renaming is a one-line change.

### Technical requirements
- Pure CSS keyframes and SVG on `transform`, `opacity` and `stroke-dashoffset`. No image files, no JS animation library.
- **No flash of the page behind it.** Add a tiny inline script in `<head>` that decides, before first paint, whether the splash should show and sets `document.documentElement.dataset.splash = "1"`. The splash markup is server-rendered in the root layout and shown with CSS when that attribute is set. React removes it when done. If JS fails, a CSS-only animation hides it after 3s so nobody gets stuck.
- Make `manifest.background_color` and `theme_color` match the splash background so the operating-system splash flows into this one without a color jump.
- Accessibility: `role="status"` and `aria-label="Loading Tallo"` while visible; set `inert` on the app root behind it; remove it from the accessibility tree when finished.
- Add `?splash=1` to any URL to replay it (for presentations).
- Update `DESIGN.md` section 6 (allowed animations): add a row "Splash: once per first visit or PWA cold launch, 2s at most, skippable". Update the animation grep in the self-review checklist.

---

## Part 2: installed PWA must never show the landing page

Required behavior:
- **Installed PWA, logged in:** opens straight to `/home`.
- **Installed PWA, logged out:** opens straight to `/login`. If this device has never had an account (`localStorage["tallo.returning"]` unset), open `/signup` instead. Set that flag after the first successful signup or login.
- **Landing page (`/`) never renders inside the installed PWA.**
- **Website, logged in:** visiting `/`, `/login` or `/signup` redirects to `/home`. `/home` already redirects to `/onboarding` if onboarding is incomplete; confirm that works.
- **Website, logged out:** `/` shows the landing page as normal.

Implementation notes:
- Manifest: `start_url: "/home"`, `id: "/"`, `scope: "/"`, `display: "standalone"`.
- `proxy.ts`: redirect authenticated users away from `/`, `/login`, `/signup`, and unauthenticated users away from app routes (keep the `?next=` parameter). **Do not make a network call on every navigation.** Check what `proxy.ts` does now. If it calls `supabase.auth.getUser()` per request, that adds a round trip to every tab switch. For redirect decisions use the local session cookie, or `getClaims()` if the installed supabase-js has it. Every API route must still verify with `getUser()`. State what you chose.
- The landing page is static, so the standalone check must happen client-side **before paint**: put it in the same inline head script as the splash decision and use `location.replace`, so the landing page never flashes.
- Add Playwright tests: (a) logged-in user visiting `/`, `/login`, `/signup` ends on `/home` with no landing content ever visible; (b) stub standalone mode with `page.addInitScript` (override `matchMedia("(display-mode: standalone)")` and `navigator.standalone`), logged out, visit `/` and assert redirect to `/signup` (no flag) or `/login` (flag set) and that the landing hero is never visible.

---

## Part 3: instant-feeling navigation

You reported skeletons, view transitions and SWR as implemented, but switching tabs still feels hard, with no transition and nothing preloaded. Tests that check function do not check feel. Fix the cause.

### 3a. Sliding active pill
Build one reusable `SlidingPill` indicator and use it in: the desktop sidebar (vertical), the tablet rail (vertical), the mobile bottom bar (horizontal; the center Sell button keeps its own style), the Reports Week/Month toggle, and the Sell mode switcher.
- One absolutely positioned element. Its position comes from measuring the active item (`getBoundingClientRect` or `offsetLeft/offsetTop` via refs, re-measured with `ResizeObserver` and on font load).
- Animate with a CSS `transform` transition, 200ms, `cubic-bezier(0.2, 0, 0, 1)`. This is interruptible: clicking another tab mid-move redirects it smoothly.
- **No animation on first paint** (it must not slide in from the corner).
- **Move the pill on pointer-down, not after navigation finishes.** Keep a local `pendingHref` and use it for the active state until the pathname catches up. This is the biggest single contributor to feeling instant.
- Reduced motion: jump instantly.

### 3b. Page content transition
- Keep the shell (sidebar, header, bottom bar) mounted; only the main content swaps.
- Enter transition only: 120 to 160ms fade plus 4px upward slide. **No exit animation** (it would delay navigation). Use the View Transitions API where supported, with the CSS fallback. Navigation must never wait for an animation.

### 3c. Data layer: show cached data immediately
- Replace the fetch-in-`useEffect` pattern with TanStack Query on every app page (Home, Sell, Stock, Debts, Reports, detail pages). Defaults: `staleTime` 30s, `gcTime` 10 minutes, `refetchOnWindowFocus` on.
- Persist the query cache (IndexedDB via idb-keyval, using the TanStack persister). On a cold start the app paints cached data immediately and refreshes in the background. Clear the persisted cache on sign-out and account deletion.
- When cached data exists, **do not show a skeleton**. Show it instantly and show a subtle "Updating" state. Only show a skeleton when there is no data at all.
- Add `loading.tsx` for the `(app)` route group and for each tab route with skeletons that match the real layouts. Skeleton shimmer runs only while loading and respects reduced motion.
- Mutations (tap-sell, payments, undo) update the cache optimistically and invalidate the affected queries.

### 3d. Preload before the user switches
- After first paint, in `requestIdleCallback`, prefetch **the route bundle** for every tab (`router.prefetch`) and **a small slice of data** for each: items (first 50 with forecast), customers (top 20 by balance), and the current-week report facts. Use `queryClient.prefetchQuery`.
- On pointer-down, hover or focus of a tab, prefetch that tab's data immediately, before navigation.
- Respect low bandwidth: if `navigator.connection.saveData` is true or the connection is 2g, prefetch routes only, not data.
- Navigation uses `<Link>` for every tab so Next's own prefetching works.

### 3e. Budgets and measurement
- Warm cache, production build: **click to target page content visible under 150ms median, under 300ms p95.** Cold (no cache), skeleton visible within one frame, real content as soon as the network allows.
- Write a Playwright test that logs in, visits every tab once to warm, then switches between all 5 tabs repeatedly while measuring time from click to the target page heading visible. Print p50 and p95 per tab. Fail the test if p95 is over 300ms and report the true numbers whether or not they pass.
- Record a short Playwright video of tab switching (mobile viewport and desktop viewport) and of the splash; give me the file paths.
- Report first-load JS size of `/home` before and after (from the build output).

---

## Part 4: local git, ready for a remote repo

Check `git status` and `git log` first. If there are no commits, the whole project is untracked.
1. `.gitignore` must exclude: `.env*` except `.env.example`, `node_modules`, `.next`, `out`, `test-results`, `playwright-report`, `tests/screenshots`, `public/sw.js`, `public/sw.js.map`, `public/swe-worker-*`, `public/workbox-*`, `*.tsbuildinfo`, OS files. Commit `pnpm-lock.yaml`.
2. **Secret scan before any commit:** search the tree for `sb_secret_`, `sb_publishable_`, `AIza`, `service_role`, and JWT-looking strings, and confirm `.env.local` is untracked. Paste the (clean) result. `seed:demo` must not contain a hardcoded password: read it from `DEMO_PASSWORD` in `.env.local` and document it in `.env.example`.
3. Make **logical commits on `main`** using Conventional Commits, grouped by area, in this order (adjust if a group is empty): `chore: scaffold project`, `feat(db): schema, rls, rpc functions and catalog seed`, `feat(domain): forecast, matching, debts, insights`, `feat(auth): signup, login, onboarding`, `feat(entries): items, stock and entries api`, `feat(sell): tap, type, speak and snap entry`, `feat(ai): gemini provider with fallback`, `feat(reports): reports and csv export`, `feat(pwa): service worker, manifest, offline queue`, `feat(ui): design system and app shell`, `feat(motion): splash and sliding navigation`, `test: unit, integration and e2e suites`, `docs: readme and specs`. Put `CODEBASE_SPEC.md` and `DESIGN.md` under `docs/`.
4. Use my existing git identity. If none is configured, stop and ask me; do not invent one.
5. Do not claim every intermediate commit builds. **The final commit must pass lint, typecheck, unit tests and build.** Tag it `v0.1.0-mvp`.
6. Add `.github/workflows/ci.yml` that runs install, lint, typecheck and unit tests (no E2E and no DB tests; those need secrets).
7. Add a "Deploy" section to the README: create the GitHub repo, `git remote add origin <url>`, `git push -u origin main --tags`, import into Vercel, and the exact list of environment variables to set. Remind that the build command must be `next build --webpack`. **Do not push anything.** Do not add a remote.
8. Show `git log --oneline` and `git status` at the end.

---

## Final report (required)

1. Raw output of `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the full `pnpm test:e2e`.
2. Every test file edited and what changed.
3. The tab-switch timing table (p50 and p95, warm and cold) and first-load JS before and after.
4. Paths to the videos and screenshots.
5. A table for Parts 0 to 4: each requirement, done / partly / not done, file, and notes.
6. Anything you could not verify.
