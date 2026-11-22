# Tallo — Sales & Stock Tracker for Small Shop Owners

Tallo is a lightweight, mobile-first sales and stock tracker designed for small retail and wholesale shop owners. It allows recording sales by tapping, typing, speaking, or photographing a handwritten note.

## Features
- **Fast Tap Sales:** Record everyday sales in under 5 seconds with instant offline queue support.
- **Multimodal Entry:** Free-text, voice notes, and receipts/handwritten notes parsed using Google Gemini (with mandatory confirm screen).
- **Stock Forecasting:** Predict days remaining and stockouts using deterministic 14-day trailing averages.
- **Credit Ledger:** Track customers who owe money and easily copy payment reminders.
- **Actionable Reports:** Weekly and monthly performance summaries with buy-more / buy-less guidance.
- **Installable PWA:** Offline-capable shell and cached catalogue.

---

## Setup & Running Locally

### 1. Prerequisites
- Node.js (v20+ recommended)
- `pnpm` (v10+)
- Supabase account (free tier)
- Google AI Studio API Key (free tier)

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the following variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Project Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (server-only)
- `GEMINI_API_KEY`: Your Google AI Studio API key
- `GEMINI_MODEL`: `gemini-3.5-flash-lite` (primary)
- `GEMINI_FALLBACK_MODEL`: `gemini-3.6-flash` (fallback on 503/429)
- `AI_PROVIDER`: `gemini` (or `mock` for tests)
- `AI_DAILY_LIMIT_PER_USER`: `10` (Gemini limits: check AI Studio)

> **Important Supabase Auth Configuration:**
> In your Supabase Dashboard, go to **Authentication -> Providers -> Email** and **disable "Confirm email"**. This allows shop owners to sign up and start onboarding immediately without waiting for verification emails.

### 3. Database Migration & Seed
Run the migrations in `supabase/migrations/` using either the Supabase CLI (`supabase db push`) or by pasting the SQL directly into the Supabase SQL Editor.
Then run `supabase/seed.sql` to populate the global catalog.

### 4. Install Dependencies
```bash
pnpm install
```

### 5. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Vercel Deployment Checklist

Follow this checklist when deploying Tallo to Vercel:

### 1. Environment Variables in Vercel Dashboard
In your Vercel Project Settings -> **Environment Variables**, configure:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (e.g. `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase secret service role key (encrypted, server-only)
- `GEMINI_API_KEY`: Google AI Studio API key
- `GEMINI_MODEL`: `gemini-3.5-flash-lite`
- `GEMINI_FALLBACK_MODEL`: `gemini-3.6-flash`
- `AI_PROVIDER`: `gemini`
- `AI_DAILY_LIMIT_PER_USER`: `10`

### 2. Supabase Auth Configuration
1. In your Supabase Dashboard -> **Authentication** -> **URL Configuration**:
   - Set **Site URL** to your Vercel production domain: `https://<your-project>.vercel.app`
   - In **Redirect URLs**, add: `https://<your-project>.vercel.app/**` and `http://localhost:3000/**`
2. Under **Authentication** -> **Providers** -> **Email**:
   - Ensure **Confirm email** is toggled **OFF** for seamless instant onboarding.

### 3. Database Migrations
In the Supabase SQL Editor, run:
1. `supabase/migrations/20261122000000_catalog_prices.sql` (Creates ledger, RLS policies, items, catalog columns, and RPCs)
2. `supabase/seed_prices.sql` (Populates reference catalog benchmarks)

### 4. 2-Minute Production Verification
After deployment completes:
1. Open `https://<your-project>.vercel.app` in a fresh incognito window:
   - Confirm landing page styling applies immediately (proper typography, green `#0E7C57` buttons, balanced grids, no unstyled HTML or oversized SVGs).
2. Click **Start free**:
   - Complete signup with a test email/password.
   - Enter shop name and select default catalog items.
3. Land on `/home`:
   - Tap any Quick Sell tile to confirm instant sales logging (< 5s).
   - Check the stock tab to verify items and price estimates.
4. Check PWA Installability:
   - On Chrome, verify the Install icon appears in the address bar. On mobile Safari, verify the Add to Home Screen drawer affordance works.

---

## How to feel the real speed

To experience Tallo's true instant navigation speed and offline PWA capabilities:
```bash
pnpm build && pnpm start
```
In development mode (`pnpm dev`), Next.js compiles every route on-demand on first visit, introducing artificial compile pauses on cold routes. In production mode, all pages, server components, and client bundles are precompiled, and the Serwist service worker is registered and actively precaches the app shell for instant zero-latency tab switching.

---

## Scripts & Testing

- **Lint:** `pnpm lint`
- **Typecheck:** `pnpm typecheck`
- **Unit & Integration Tests:** `pnpm test`
- **E2E Tests:** `pnpm test:e2e`
- **Production Build:** `pnpm build`
- **Demo Seed:** `pnpm seed:demo`

---

## Deploy to Vercel

### 1. Repository Setup
Push the repository to your GitHub/GitLab account:
```bash
git remote add origin https://github.com/your-username/tallo.git
git branch -M main
git push -u origin main --tags
```

### 2. Import to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
2. Select your `tallo` repository and import it.
3. Framework preset: **Next.js**.
4. Build command: `next build --webpack` (or keep default `pnpm build` which runs `next build --webpack` to generate the Serwist PWA service worker).
5. Output directory: `.next`.

### 3. Environment Variables
Configure the following environment variables in Vercel Project Settings:
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL (`https://<id>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (kept secret on server) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_MODEL` | No | Default: `gemini-3.5-flash-lite` |
| `GEMINI_FALLBACK_MODEL` | No | Default: `gemini-3.6-flash` |
| `AI_PROVIDER` | No | Default: `gemini` (use `mock` in preview/test) |
| `AI_DAILY_LIMIT_PER_USER` | No | Default: `10` |
| `DEMO_PASSWORD` | No | Secure password for demo seeder script |
| `NEXT_PUBLIC_APP_URL` | Yes | Your production URL (`https://your-domain.vercel.app`) |

Click **Deploy**. Vercel will install dependencies with pnpm, build the Next.js bundle and Serwist service worker, and deploy globally.
