# Trip Consumption Analysis

A browser-only app for tracking trips by transport mode and seeing the energy use and
CO&#8322; footprint of your mobility. GPS tracking, calculation and storage all run on
the device; nothing is sent to a server.

Live app: **https://teefaxx.github.io/trip-consumption-analysis/**

## Features

- Track a trip with a live map, switch transport mode mid-trip, and get an instant
  energy/CO&#8322; summary on "End trip".
- History page: pick a day, see its legs on the map coloured by mode, totals and a
  per-mode breakdown.
- Trips are stored locally (IndexedDB); export/import as JSON to back up or move data
  between devices.
- Import the 2022 course dataset directly from its CSV file.
- Installable PWA with an offline app shell (the basemap still needs a connection).

## How the numbers are computed

GPS points are cleaned (accuracy, jitter, implausible speed), split into legs by
transport mode, and each leg's distance — summed from its GPS track — is multiplied by
a per-passenger-km energy/CO&#8322; factor for that mode. See
[`docs/modernization-plan.md`](docs/modernization-plan.md) for the full engine spec and
[`docs/mobitool-factors.md`](docs/mobitool-factors.md) for where the factor values come
from. The current factor set and its source are also shown on the app's About page.

## Development

```bash
npm install
cp .env.example .env   # then set VITE_MAPBOX_TOKEN=pk.… in .env
npm run dev             # http://localhost:5173/trip-consumption-analysis/#/
npm test
npm run lint
npm run build
npm run preview
```

## Deployment

GitHub flow: `main` is always live. Work happens on short-lived feature branches merged
through pull requests; CI (lint, type-check, tests, build) runs on every pull request,
and a push to `main` builds and deploys to GitHub Pages. The workflow also has a manual
trigger ("Run workflow") to deploy any branch to the live URL for phone testing —
redeploy `main` afterwards to restore the production build.

One-time repository setup:

- Settings → Secrets and variables → Actions → new secret `MAPBOX_TOKEN`, a Mapbox
  **public** token restricted to `http://localhost:*` and this repo's GitHub Pages
  origin. A URL-restricted public token is expected in a static site's client bundle;
  the restriction is what protects the quota.
- Settings → Pages → Source: **GitHub Actions**.
- Settings → Environments → `github-pages` → Deployment branches and tags: add a
  rule for `refactor/*` (or choose "No restriction"). GitHub creates this environment
  with a `main`-only rule, and without the extra rule the manual "Run workflow" deploy
  of a feature branch fails at the deploy step with "not allowed to deploy to
  github-pages due to environment protection rules".

## Project structure

```
src/
├── lib/          calculation engine (pure TypeScript, unit-tested)
├── storage/      trip persistence (Dexie/IndexedDB)
├── store/        app state (zustand)
├── components/   shared UI
└── pages/        Track / History / About
docs/             modernization plan, mobitool factor research
legacy/           the 2022–2023 course project (not deployed)
```

## Legacy version

The original 2022–2023 course project (Flask + PostGIS backend, Leaflet frontend) is
kept under [`legacy/`](legacy/) for reference and is not part of the deployed app.
Contributors: Dario De Luca, Luca Dominiak, Leonard Haas, Raúl Lara.

## License

See [LICENSE](LICENSE).
