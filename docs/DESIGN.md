# TALLO — Design Specification

> For the build agent. Apply this **after** the functional MVP from `CODEBASE_SPEC.md` is built and reviewed. This is a restyle and polish pass: do not change routes, APIs or data logic unless a section below says so.
> Goal: **simple, fast, and a little delightful.** Motion should make the app feel alive without ever costing the user time.

---

## 1. Brand

### Name: **Tallo**
From "tally" (the tick marks traders use to count) plus a friendly "-o". Short, easy to say, easy to type.
Tagline: **"Know your shop."**
Alternates if the name is taken: Tallyo, Shelfwise, Counta. **Check domain, app-store and trademark availability before final use.**

### Logo
Concept: a **tally mark** (four vertical strokes struck through by a diagonal amber stroke) inside a rounded square. It says "counting" instantly and works at 16px.

Primary app icon (`/public/icons/icon.svg`). Use this as the source and export PNGs at 192, 512 and 1024, plus favicon (32, 48):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0E7C57"/>
  <g stroke="#FFFFFF" stroke-width="36" stroke-linecap="round">
    <line x1="150" y1="138" x2="150" y2="374"/>
    <line x1="226" y1="138" x2="226" y2="374"/>
    <line x1="302" y1="138" x2="302" y2="374"/>
    <line x1="378" y1="138" x2="378" y2="374"/>
  </g>
  <line x1="112" y1="330" x2="416" y2="182" stroke="#F5B83D" stroke-width="36" stroke-linecap="round"/>
</svg>
```
- **Maskable icon:** full-bleed green square (no rounded corners), with the strokes scaled to fit inside the central 80% safe zone.
- **Monochrome version:** all strokes in one color, for dark mode headers and print.
- **Wordmark:** "Tallo" set in the display font (section 3), weight 700, tight tracking, next to the icon. Minimum logo clear space = the stroke width. Never stretch, rotate, recolor with gradients or add shadows.
- Open Graph / share image 1200×630: flat brand green background, icon, wordmark, tagline.

### Voice
Plain, warm, short. Talk like a helpful shop neighbor, not a bank. "Rice is selling fast. About 3 days left." not "Inventory depletion forecast".

---

## 2. Design rules (the lint list)

Every screen must pass this before it is considered done.

1. **No purple. No gradients anywhere.** Flat fills only. Depth comes from borders and spacing, with at most one subtle shadow level.
2. **Real icons only.** Use **Lucide React**. No emoji as UI icons, no inline hand-drawn SVGs except the logo. One stroke width (1.75) and two sizes (20 and 24).
3. **Delete useless badges.** A badge is allowed only if it tells the user something to act on: `Low`, `Out`, `Owes`, `Offline`, `Syncing`. No "New", "Pro", "Beta", decorative count dots or pills that repeat the surrounding text.
4. **Flatten nested cards.** Maximum one level of card. Inside a card use dividers, spacing and headings, not another bordered box. A list of rows is not a list of cards.
5. **Group related items.** Put related things under one heading and one container (proximity + common region). Unrelated things get more space between them than related ones.
6. **Match corner radii.** Use only the radius tokens in section 3. Nested radius = outer radius − padding between them. One radius per component type, applied everywhere.
7. **Animate only when needed.** No looping animation unless it directly communicates a live state (recording pulse while recording, skeleton shimmer while loading, spinner while pending). Everything else plays once, in response to a user action or a state change.
8. **Respect `prefers-reduced-motion`.** Replace movement with instant or opacity-only changes.
9. **One primary action per screen.** Exactly one filled brand-colored button in view.
10. **Contrast AA minimum** (4.5:1 text, 3:1 large text and UI edges) in both themes. Verify, don't assume.

---

## 3. Design tokens

Define as CSS variables, map into the Tailwind theme and the shadcn theme. Light and dark both required.

### Color
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F7F6F2` | `#0E1512` |
| `--surface` | `#FFFFFF` | `#151E1A` |
| `--surface-2` | `#EFEDE6` | `#1C2722` |
| `--border` | `#E2DFD5` | `#2A3731` |
| `--text` | `#14201B` | `#EAF0EC` |
| `--text-muted` | `#5B6760` | `#9AA9A1` |
| `--brand` | `#0E7C57` | `#3CC38C` |
| `--brand-hover` | `#0B6647` | `#5ED3A3` |
| `--brand-soft` | `#DDF1E8` | `#143A2B` |
| `--on-brand` | `#FFFFFF` | `#08140F` |
| `--accent` (amber, used sparingly) | `#F5B83D` | `#F5B83D` |
| `--accent-soft` | `#FDF0D0` | `#3A2E10` |
| `--danger` | `#C8372D` | `#F07A70` |
| `--danger-soft` | `#FBE4E1` | `#3A1714` |
| `--warning` | `#B7791F` | `#E5A94B` |

Meaning: **green = healthy / primary action**, **amber = running low / attention**, **red = out / owed overdue / destructive**. Never rely on color alone; pair with text or icon.
Verify every text/background pair for contrast; adjust the exact hex values if any pair fails, and keep the hue family.

### Typography
- Display (headlines, big numbers): **Bricolage Grotesque** (variable, via `next/font`, self-hosted).
- Body/UI: **Inter** (via `next/font`).
- Scale: 12 / 14 / 16 (body) / 18 / 20 / 24 / 32 / 40 (display). Line height 1.5 body, 1.15 headings.
- **Balanced headlines:** `text-wrap: balance` on all headings; `text-wrap: pretty` on paragraphs.
- **Tabular numbers:** `font-variant-numeric: tabular-nums` on every money value, quantity, table column and counter, so digits do not jiggle.

### Spacing, radius, elevation
- 4px base grid. Common steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius tokens: `--r-sm: 8px` (inputs, chips), `--r-md: 12px` (buttons, cards, rows), `--r-lg: 16px` (modals), `--r-xl: 24px` (bottom sheets, top corners). Pills (`9999px`) only for chips and the recording button.
- **Continuous corners:** where supported use `corner-shape: squircle` (progressive enhancement); fall back to plain `border-radius`. The logo and app icon use continuous corners.
- Elevation: prefer `1px` borders. One shadow level `0 1px 2px rgb(0 0 0 / 0.06)` for floating surfaces (sheet, popover, toast).
- Touch targets: minimum **44×44px**. See "hit slop" in section 6.

---

## 4. Layout and responsiveness

Mobile-first. Test at **320, 375, 414, 768, 1024, 1280, 1536** widths, portrait and landscape, and at 200% browser text zoom. No horizontal scroll at any width.

| Breakpoint | Navigation | Content |
|---|---|---|
| `< 640px` (phone) | **Bottom tab bar**, 5 slots | Single column, 16px side padding |
| `640–1023px` (tablet) | **Left icon rail** (72px) | Content max 720px, centered |
| `≥ 1024px` (desktop) | **Sidebar** 240px with labels and shortcut hints | Content max 1100px, optional right detail panel |

**Bottom tab bar (phone):** Home · Stock · **Sell** (center, emphasized) · Debts · Reports. Settings lives behind the avatar in the header. Home and Reports sit at the ends (serial position: ends are remembered best); **Sell** is the one filled brand-colored tab (Von Restorff: the primary action stands out).
- Bottom bar uses `padding-bottom: env(safe-area-inset-bottom)`. Header uses `env(safe-area-inset-top)`. Set `viewport-fit=cover`. Respect left/right insets in landscape.
- Hide the bottom bar while the on-screen keyboard is open.

**Sticky headers:** page headers stick on scroll with a 1px bottom border that appears only after scrolling (no shadow). Tables and long lists keep column headers sticky.

---

## 5. Screens

Each screen needs four states: **loading** (skeleton matching the final layout), **empty** (one sentence + one action), **error** (plain message + retry), **success**.

### 5.1 Landing (`/`) — static, pre-rendered
1. Sticky header: logo, links (How it works, FAQ), Log in (ghost), **Get started** (primary). On phones, links collapse into a menu sheet (mobile menu).
2. Hero: balanced headline ("Know what to restock, and who still owes you."), one sentence, one primary CTA, a phone mockup showing the Home screen.
3. How it works, three steps in a row (stack on phone): **Speak or snap your sales → See what's running out → Get a weekly plan**.
4. Features grouped into three clear groups (Log faster, Never run out, Know who owes you), each with a real Lucide icon. No cards inside cards.
5. FAQ (expandable accordion): Is it free? Does it work offline? Does it understand Pidgin? Is my data private? Can I use it on my phone?
6. Final CTA, footer (Privacy, Terms, "Last updated" date).
7. Extras: scroll progress bar at the top, **floating contact** button (WhatsApp or email link, bottom-right, landing and help only, never inside the app where the Sell tab lives), simple cookie banner, back-to-top.

### 5.2 Signup / Login
- Single column card, max 400px. Three fields only: name, email, password.
- Password visibility toggle (eye icon, accessible label, does not steal focus).
- Inline validation on blur, error text under the field, field outline in danger color, error summary announced to screen readers.
- Submit button shows pending spinner, disabled during request. **Form success state:** brief check + "Welcome, {name}" then move on.
- Correct `autocomplete`: `name`, `email`, `new-password` / `current-password`. Use `inputmode` and `enterkeyhint`.
- If a one-time code is ever used (password reset or email verification), use a single OTP input with `autocomplete="one-time-code"` and `inputmode="numeric"` so the phone suggests the code.

### 5.3 Onboarding (3 steps, goal-gradient)
- Top progress bar fills as steps complete (starts partly filled so the user feels already underway). Step label "Step 2 of 3".
- Step 1: two large choices, **Retail** / **Wholesale**, each with icon and one-line description.
- Step 2: category tiles (multi-select, icon + name). Selected state = brand outline + check icon.
- Step 3: items grouped by category. **Pre-selected items are checked.** Search box at the top. "Add your own item" row at the end. A sticky bottom bar shows "{n} items" and the primary **Done** button.
- Progressive disclosure: no prices, units or quantities asked here. Those come later, in context.
- Completion: one-time success animation, then Home with the setup checklist.

### 5.4 Home
- Header: greeting + date. Avatar opens Settings.
- **Today strip:** sales amount (large, display font, tabular), sale count, credit given. Values animate with a one-time count-up on first load only.
- **Running low:** up to 3 rows. Each row: item name, "about 3 days left", thin progress meter, `Low` or `Out` badge only when relevant. "See all" link.
- **Who owes you:** up to 3 rows: name, amount, "since 12 days ago". "See all" link.
- **Quick sell tiles** (top items). Tap = sale with optimistic update and an Undo toast.
- **Setup checklist** (until complete) with a progress ring (goal-gradient). Collapses to a small row when finished.
- "Updated 2 min ago" line (last updated date) with a refresh icon button.

### 5.5 Sell
- Segmented control at top: **Tap · Speak · Snap · Type**. Tap is the default (fastest). Remember the last used mode.
- **Tap:** grid of item tiles (2 columns on small phones, 3 on large, 4+ on tablet/desktop). Each tile: name, price, small stepper appears after the first tap. Credit toggle opens a customer picker sheet.
- **Speak:** one large circular record button (pill-shaped on press). While recording: timer, simple level meter, button pulse (this is the only allowed loop). Steps shown as text while processing: "Listening… → Reading… → Done" so the wait feels short (Doherty threshold: show feedback within 100ms, finish perceived work within 400ms where possible).
- **Snap:** camera button and upload button side by side, equal weight. After capture: preview with a **BlurHash placeholder** while the compressed image loads, then "Reading your note…".
- **Type:** quick form on top, free-text box below with hint "Try: 2 rice 5k credit Mama Ngozi".
- **Confirm sheet** (bottom sheet on phones, dialog on desktop): transcript at top (collapsible), then one row per entry. Problem rows are flagged inline (amber outline + message), not with extra badges. Primary: **Save all**. Secondary: Discard. The sheet is **swipe-to-dismiss** and closable with Escape and the system back gesture.
- After saving: **Peak-end moment.** A short, satisfying success state (check draws once, "3 sales saved", running total updates), plus an Undo toast. The first sale ever gets a slightly larger celebration, once.

### 5.6 Stock
- Search + filter chips (All, Low, Out). Sort by days left.
- Rows: name, quantity + unit, days-left text, thin meter. Status text/color only when `Low`, `Out` or `Overstocked`.
- Tap a row to open a detail sheet: history list, **Restock**, **Adjust**, edit, archive. Archive uses a **confirmation modal**.
- Sticky column header on desktop table view.

### 5.7 Debts
- List of customers with balance, oldest age. Sorted by amount. Search.
- Detail: ledger (credit sales and payments grouped by date), **Record payment** (primary), **Copy reminder message** (copy button with "Copied" state for 2 seconds).
- Marking fully paid or deleting a payment uses a confirmation modal. Payment recording itself is optimistic with Undo.

### 5.8 Reports
- Week/Month segmented toggle and period stepper.
- Reading order: one-paragraph narrative → KPI row → **Buy more** → **Buy less** → Top sellers → Debts. Group each as one section with a heading, no nested cards.
- Top sellers: simple horizontal CSS bars (no chart library, keeps the app light), tabular numbers.
- **Copy summary** button. **Print stylesheet:** hides navigation, buttons and animations; black on white; page breaks between sections; logo and period at top; "Last updated" in the footer.
- Scroll progress bar at the top of the page. Back-to-top button after scrolling past 2 screens.
- End of page: "You're all caught up" + the single next action (e.g. "Restock rice"). This is the **peak-end** closer.
- If `dataQuality = 'thin'`, show one calm line explaining the report will improve with more days of data.

### 5.9 Settings
Grouped sections: Profile, Shop (name, currency, timezone), Appearance (**dark mode toggle**: Light / Dark / System), Data (export CSV), Connections (Telegram/WhatsApp, Phase 5), Account (sign out, delete account with confirmation modal). Include "Last updated" on Privacy and Terms pages.

### 5.10 Command menu and search
- `Ctrl/Cmd+K` opens it. Sections: Actions (Sell, Restock, Add item, Record payment), Go to, Items, Customers. Recent items first.
- On phones, a search icon in the header opens the same menu full-screen.
- Desktop: show **shortcut hints** (small `kbd` labels) next to actions and sidebar items, e.g. `G H` Home, `N` New sale, `/` Search. Hide hints on touch devices.

### 5.11 System pages
404, offline and error pages: logo, one sentence, one action. Offline page tells the user what still works (Tap sales are saved and will sync).

---

## 6. Motion and interaction

### Principles
- Motion explains cause and effect. If it does not help the user understand what just happened, remove it.
- Fast. Durations: **instant 0ms** (state toggles), **120ms** (hover, press), **200ms** (most transitions), **320ms** (sheets, page changes). Nothing over 400ms except the one-time celebration (max 600ms).
- Easing: `cubic-bezier(0.2, 0, 0, 1)` for entering, `cubic-bezier(0.4, 0, 1, 1)` for leaving; springs only for sheets.
- **Interruptible:** use CSS transitions or spring animations (never fixed keyframes) for anything the user can trigger repeatedly, so a new action smoothly redirects the current one instead of waiting or snapping.
- Animate only `transform` and `opacity`. No layout-shifting animation.
- Reduced motion: replace all movement with a 100ms fade or nothing.

### Allowed animations (and nothing else)
| Where | What | Loops? |
|---|---|---|
| Button press | scale to 0.97, 120ms | no |
| Page/route change | view transition crossfade, 200ms | no |
| Bottom sheet | spring up; swipe down to dismiss | no |
| Toast | slide in, auto-dismiss | no |
| Success check | draws once, 400ms | no |
| Number count-up | once on first view of Home, ≤ 600ms | no |
| List row add/remove | height + fade, 200ms | no |
| Skeleton | soft shimmer **only while loading** | yes, while loading only |
| Spinner | **only while a request is pending** | yes, while pending only |
| Recording pulse | **only while recording** | yes, while recording only |
| Splash | once per first visit or PWA cold launch, 2s at most, skippable | no |

Anything not in this table does not animate. In particular: no floating, bobbing, rotating or pulsing decorations; no animated gradients; no auto-playing carousels; no parallax.

---

## 7. How each item in your list is applied

### 7.1 UI tips
| # | Tip | Where and how |
|---|---|---|
| 1 | Skeleton loaders | Every list, Home strip, report sections. Skeleton matches final layout dimensions to avoid layout shift. |
| 2 | Optimistic updates | Tap-sell, restock, record payment, archive. TanStack Query `onMutate` updates cache and rolls back on error with a clear toast. |
| 3 | Command menu | `Ctrl/Cmd+K`, section 5.10 (shadcn `Command`/cmdk). |
| 4 | Shortcut hints | `kbd` labels in the command menu and sidebar, desktop only. |
| 5 | Undo toasts | After every save, void, payment or archive. About 8 seconds, undo calls the unvoid/void API (sonner toast). |
| 6 | Stale-while-revalidate | TanStack Query `staleTime` + service worker SWR for GET routes (see CODEBASE_SPEC section 11). Show "Updated X ago". |
| 7 | Pre-rendering | Landing, legal and FAQ pages are statically generated. App pages stream with skeletons. |
| 8 | BlurHash placeholders | Marketing images and the Snap preview. Generate hashes at build time for static images. |
| 9 | View transitions | Route changes and list-to-detail using the View Transitions API with a crossfade fallback; honor reduced motion. |
| 10 | Swipe-to-dismiss sheets | All bottom sheets use shadcn `Drawer` (vaul). Also closable via handle, Escape and back. |
| 11 | Interruptible animations | Rule in section 6; applies to sheets, toasts, toggles. |
| 12 | Predictive back | Every sheet/modal pushes a history entry so the Android back gesture closes the top overlay instead of leaving the page; closing animations must be reversible/interruptible. |
| 13 | Hit slop | Small icon buttons (close, copy, eye toggle) get an invisible `::after` expanding the target to 44×44 without changing visual size. |
| 14 | Safe area insets | Bottom bar, header, sheets and floating buttons use `env(safe-area-inset-*)`. |
| 15 | One-time code autofill | OTP input with `autocomplete="one-time-code"` (password reset or email verify). |
| 16 | Tabular numbers | All money, quantities, counters, table columns. |
| 17 | Balanced headlines | `text-wrap: balance` on headings. |
| 18 | Continuous corners | `corner-shape: squircle` progressive enhancement on cards, buttons, sheets, app icon. |
| 19 | Idempotency keys | Client generates a UUID per save/payment and sends it as `Idempotency-Key`; offline queue replays reuse it. (Already in the backend spec.) |
| 20 | Amazon safe triangle | Desktop sidebar flyouts and dropdown submenus (user menu, Sell menu) keep open while the pointer moves diagonally toward the submenu. Radix menus provide most of this; verify it, and add a triangle guard where a custom flyout is used. |

### 7.2 UI features
| Feature | Where and how |
|---|---|
| Sticky headers | App page headers, table headers, landing header. |
| Skip to content | First focusable element on every page; visible on focus; jumps to `<main>`. |
| Password visibility toggle | Signup and login. |
| UTM tracking | Landing captures `utm_*` into `localStorage`; sent in signup metadata (stored in `profiles.utm`). |
| Form success state | Signup, add item, record payment, settings saves. Check + short message, then continue. |
| Loading animations | Skeletons, button spinners, "Listening… Reading… Done" progress text (section 6 rules). |
| Form error state | Inline field errors, summary for screen readers, retry on network errors. |
| Hover states | Rows, buttons, links, tiles; only under `@media (hover: hover)` so touch devices do not get stuck hovers. |
| Scroll progress bars | Landing page and Reports page. |
| Copy button | Debt reminder message, report summary. Shows "Copied" for 2s; falls back to selecting text if the Clipboard API fails. |
| Print stylesheet | Reports page (section 5.8). |
| Dark mode toggle | Settings, and a small toggle in the landing header; persists; no flash on load (set theme class before paint). |
| Simple cookie banner | Small bottom banner on first visit: one sentence, "OK" button, link to Privacy. The app uses only essential storage; do not add analytics scripts that would require more. |
| Site search | Command menu search over items and customers; landing page does not need search. |
| Back-to-top button | Landing, Reports, long Stock list. Appears after ~2 screens of scroll. |
| Mobile menus | Landing: header menu sheet. App: bottom tab bar. |
| Confirmation modals | Only for destructive or irreversible actions: archive item, delete payment, delete account. Not for saving. Safe action is the default focus. |
| Last updated date | Home ("Updated X ago"), Stock, Reports footer, Privacy and Terms. |
| Expandable FAQ | Landing page (Radix Accordion), one open at a time. |
| Floating contact | Landing and help pages only, bottom-right, clears the cookie banner and safe area. |

### 7.3 UX laws
| Law | Applied as |
|---|---|
| Aesthetic-usability | Clean palette, consistent radii, good type; polish the first-run path (landing, signup, onboarding) most. |
| Hick's law | Onboarding is 3 choices at a time; Sell shows 4 modes; Home shows 3 rows per section; nav has 5 items. |
| Fitts's law | Big Sell tab in the thumb zone, large record button, tiles ≥ 44px, primary buttons full width on phones, bottom-sheet actions at the bottom. |
| Jakob's law | Bottom tab bar, standard sheets, familiar login, `Ctrl/Cmd+K`, hamburger on landing: patterns people already know. |
| Miller's law | Lists chunked and grouped (by category, by date); never more than about 7 items per visible group without a heading or "See all". |
| Doherty threshold | Optimistic updates, skeletons within 100ms, staged progress text for AI waits. |
| Proximity | Related fields and rows are close; groups separated by larger gaps. |
| Similarity | Same style for same-function things: all primary actions look alike, all status text uses the same colors. |
| Common region | Group by a single container or divider rather than many boxes. |
| Visual hierarchy | One display-size number per screen section, clear heading sizes, one primary button. |
| Progressive disclosure | Onboarding asks only what is needed; prices, units, lead times appear in item detail; advanced options live in sheets. |
| Recognition over recall | Item pickers with search, recent items first, tile grid of own items, chips instead of typed values, hint text with examples. |
| Von Restorff | The Sell tab and the single primary button are the only filled brand elements; amber only for "needs attention". |
| Peak-end rule | Delight on save (first sale celebration), clean "all caught up" at report end, graceful offline and error messages. |
| Goal-gradient | Onboarding progress bar starts partly filled; Home setup checklist progress ring. |
| Serial position | Home at the start, Reports at the end of the tab bar, Sell in the center; Quick-sell tiles ordered by sales count with best sellers first. |
| Tesler's law | Complexity is absorbed by the system: auto-match items, parse "5k", pre-select catalog items, compute forecasts. The user confirms rather than constructs. |

---

## 8. Components and icons

### Component library: **shadcn/ui (on Radix primitives)**
Use shadcn/ui as the only component system. Needed components: Button, Input, Label, Checkbox, Switch, Tabs / ToggleGroup (segmented control), Dialog, Drawer (vaul), Command (cmdk), Dropdown Menu, Popover, Tooltip, Accordion, Progress, Skeleton, Sonner (toasts), Input OTP, Scroll Area, Separator, Badge (used sparingly), Select.
- **Do not add MUI or HeroUI.** Mixing libraries brings a second design language, extra bundle weight and conflicting styles. Base UI is an alternative primitive layer to Radix; do not use both.
- Restyle shadcn components through the tokens in section 3, not by overriding each instance.

### Icons: **Lucide React only**
Verify each name exists in the installed version; swap to the closest equivalent if renamed.

| Use | Icon |
|---|---|
| Home | `House` |
| Stock | `Package` |
| Sell | `Plus` (in the center tab), `ReceiptText` for entry history |
| Debts | `HandCoins` |
| Reports | `ChartNoAxesColumn` |
| Settings | `Settings` |
| Speak | `Mic` |
| Snap | `Camera` |
| Upload | `ImageUp` |
| Type | `Keyboard` |
| Tap | `Pointer` |
| Search | `Search` |
| Copy / copied | `Copy` / `Check` |
| Undo | `Undo2` |
| Low stock | `TriangleAlert` |
| Out of stock | `PackageX` |
| Password show/hide | `Eye` / `EyeOff` |
| Theme | `Sun` / `Moon` |
| Print | `Printer` |
| Back to top | `ArrowUp` |
| Menu / close | `Menu` / `X` |
| Delete | `Trash2` |
| Contact | `MessageCircle` |
| Offline / syncing | `WifiOff` / `RefreshCw` (animates only while syncing) |
| Customer | `User` |
| Money in | `ArrowDownToLine` |

Sizes: 20px in rows and buttons, 24px in navigation. Stroke 1.75. `aria-hidden` on decorative icons; icon-only buttons need accessible labels.

---

## 9. Imagery and mockups

Use mockups on the **landing page and in your school presentation**, not inside the app.
- **lummi.ai**: free stock images. Use for hero/background photography of shop and market scenes. Keep to one or two photos total to stay light.
- **mockups.supply**: free device mockups. Use to place real app screenshots inside phone/laptop frames for the hero and feature sections.
- **moyo-studio.com**: free mockups for branding, e.g. showing the logo on a signboard, receipt or bag for the presentation.

Rules:
- **Check each asset's license and attribution requirements on the site before using it.** (This document was written without browsing those sites, so confirm what is allowed.)
- Download manually and place in `/public/images/marketing/`. Convert to WebP or AVIF, max 1600px wide, under about 150 KB each. Serve with `next/image`, correct `sizes`, `alt` text, and a BlurHash placeholder. Lazy-load everything below the fold.
- Do not use stock photos of people as fake testimonials or fake customers.
- Image slots needed: `hero-phone.webp` (phone mockup with Home screenshot), `hero-photo.webp` (optional shop scene), `feature-log.webp`, `feature-stock.webp`, `feature-debts.webp` (screenshots in device frames), `og.png` (1200×630).

---

## 10. Accessibility and quality checks

- WCAG 2.1 AA. Visible focus ring (2px brand outline, offset 2px) on all interactive elements. Full keyboard operation. Logical focus order, focus trapped inside modals and returned on close.
- Labels on every input; errors tied to inputs via `aria-describedby`; toasts in an `aria-live` region.
- Screen reader names for icon buttons, status text not color-only.
- Support 200% text zoom and landscape. Touch targets ≥ 44px.
- Performance: landing Lighthouse Performance ≥ 90 on mobile; no layout shift from images, fonts (`next/font`) or skeletons; total JS kept lean (no chart or animation library unless the spec above cannot be met without it; prefer CSS and the platform's View Transitions).

### Self-review checklist (agent runs this before reporting)
- [ ] No purple or gradient anywhere (search the CSS for `gradient` and for purple hues)
- [ ] All icons are Lucide, none are emoji
- [ ] Every badge conveys an action or status (list all badges and justify each)
- [ ] No card inside a card (list screens checked)
- [ ] Related items are grouped under headings/containers
- [ ] Radii only use tokens; nested radii follow outer minus padding
- [ ] No looping animation except skeleton, spinner, recording pulse (grep for `infinite`); splash plays once and does not loop
- [ ] Reduced-motion tested
- [ ] Light and dark tested on every screen at 375px and 1280px
- [ ] Tab bar, headers and sheets tested with safe-area insets (iOS simulator or devtools)
- [ ] Tabular numbers on all numeric columns
- [ ] Items from sections 7.1 to 7.3 all implemented or explicitly listed as deferred with a reason

---

## 11. Pass order for the agent

1. Tokens, fonts, theme (light/dark), radius and spacing, logo and icon set, manifest icons.
2. App shell: responsive navigation, safe areas, sticky headers, skip link, command menu, toasts, sheets, history handling.
3. Shared patterns: skeletons, empty/error/success states, form patterns, confirmation modal.
4. Screens in this order: Sell, Home, Stock, Debts, Reports, Onboarding, Auth, Settings, Landing, system pages.
5. Motion pass (only the table in section 6), view transitions, reduced motion.
6. Print stylesheet, dark mode flash fix, cookie banner, FAQ, floating contact.
7. Imagery, BlurHash, Open Graph image.
8. Run the self-review checklist, fix, then send a short report with before/after screenshots at 375px and 1280px in light and dark.
