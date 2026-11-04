# Accounts setup (GitHub sign-in + cloud sync)

Accounts are optional. Without the two Supabase settings below the app builds and runs
exactly as before: local-only, nothing leaves the device.

Everything here fits the free tiers of Supabase and GitHub. Takes about 15 minutes.

## How it works

- **Auth:** Supabase Auth with GitHub as the only provider, PKCE flow (the redirect
  carries a one-time `?code=`, never a token).
- **Data:** one table, `public.trips`, one row per trip (the trip as JSON). The app keeps
  working offline from IndexedDB and syncs when online: local saves/deletes go to an
  outbox and are uploaded; changes from other devices are pulled by `updated_at`.
- **Security:** row-level security — every signed-in user can read/insert/update only
  rows whose `user_id` is their own; anonymous requests get nothing; hard deletes are
  not allowed (deletions are tombstones) except through "Delete account", which removes
  the user and all their rows. The key shipped in the app is the *publishable* key; it
  grants nothing beyond what these policies allow.
- **Abuse limits** (sign-up is open to any GitHub account; the free database is 500 MB
  shared by everyone): max 5 MB per trip, 50 MB and 20 000 trips per account, enforced
  by a database trigger. Adjust in `supabase/migrations/0001_trips.sql`.
- **Local separation:** each account gets its own local database on the device. Signing
  out deletes that account's local copy (after uploading pending changes). Trips recorded
  while signed out stay in the device-only database; after signing in, the app asks once
  whether to add them to the account.
- **Sample data:** a brand-new account gets four sample trips (yesterday and the day
  before, around Zurich), badged "Sample" and removable from the Account page.

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) → **New project** (free plan). Pick a
   region close to your users (e.g. Frankfurt / Zurich).
2. **SQL Editor → New query** → paste `supabase/migrations/0001_trips.sql` → **Run**.
   (Safe to re-run.)
3. **Project Settings → API keys**: note the **Project URL** and the **publishable key**
   (`sb_publishable_…`; the legacy `anon` key also works). **Never** use the `secret` /
   `service_role` key in the app.

## 2. Create the GitHub OAuth app

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Application name: `Trip Consumption Analysis`
   - Homepage URL: `https://teefaxx.github.io/trip-consumption-analysis/`
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
     (shown in Supabase under **Authentication → Sign In / Providers → GitHub**)
2. Create it, then **Generate a new client secret**.
3. In Supabase: **Authentication → Sign In / Providers → GitHub** → enable, paste the
   Client ID and Client secret → Save.

## 3. Allow the app's URLs as redirect targets

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://teefaxx.github.io/trip-consumption-analysis/`
- **Redirect URLs:** add
  - `https://teefaxx.github.io/trip-consumption-analysis/`
  - `http://localhost:5173/trip-consumption-analysis/` (local dev)

Supabase only redirects to URLs on this list, which stops a third-party site from
receiving your users' sign-in codes.

## 4. Configure the build

- **GitHub repo → Settings → Secrets and variables → Actions:** add
  `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The deploy workflow passes them to
  the build.
- **Local dev:** put the same values in `.env` as `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).

Then push to `main` (or run the workflow) and open the app → **Sign in** (top right of
the Track page).

## Operating notes

- **Free-tier pause:** Supabase pauses a free project after about a week without any
  requests. Nothing is lost; restore it from the Supabase dashboard. While paused, the
  app keeps working locally and shows a sync error.
- **Installed iPhone app (PWA):** sign-in redirects through GitHub and back. If the
  login ever finishes in Safari instead of the installed app, sign in from Safari once
  more inside the app, or use the app in Safari.
- **Seeing users:** Supabase → Authentication → Users. You (the project owner) can read
  all rows in the dashboard — the privacy note in the app says "only you can read them",
  which is true for other users of the app, not for the database owner.
