# Modernization plan: Trip Consumption Analysis

Written 2026-09-14 after a full read of the repo (3 HTML pages, 2 JS files, 4 Python modules, 8 CSS files, 5 commits from Jan–Jul 2023). Updated the same day with two decisions.

**Decisions taken so far**

- All computation and storage moves into the browser. The Flask + PostGIS backend is retired (kept under `legacy/` for reference only).
- Maps use **Mapbox GL JS** instead of Leaflet (see §1, "Map layer: Mapbox GL JS").
- Default map style: **Mapbox Standard** (`mapbox://styles/mapbox/standard`).
- No fixed user list and no shared/multi-device history. One local profile name, stored on the device; trips live on the device that recorded them; JSON export/import moves them if needed. Hosting option B (Supabase) is not planned.
- The 2022 data exists as a CSV export of the `tripleg` table (`DATA.csv`, 70 legs, kept outside the repo). It is imported inside the app; no Python anywhere in the new project.
- Git: one branch per phase (`refactor/00-hygiene`, `refactor/01-scaffold-engine`, `refactor/02-tracking`, …), each branched from the previous, merged into `main` at the end. Nothing is pushed until the user says so.
- The mobitool factors are refreshed from the current mobitool factor sheet before they go into `factors.ts`.
- Execution: Phases 0–2 are implemented by subagents on cheaper models under review; the orchestrating session reviews the calculation engine and its tests.

The plan has four parts:

0. What the app is today and what is broken
1. Modern UI stack
2. Calculation engine (correctness first, then structure)
3. Hosting (GitHub Pages) and the data-storage decision that makes it possible
4. Phased roadmap with acceptance criteria

---

## 0. Current state

### Architecture

```
Browser (index.html / feedback.html / about.html)
  jQuery 3.6 + jQuery UI (unused) + Leaflet 1.4/1.6/1.7 (loaded 3x) + GoogleMutant (unused)
        │
        │  POST /tp        (trackpoints as JSON on "End Trip")
        │  POST /feedback  (user id + date)
        ▼
Flask on http://localhost:8989  (py/app.py)
  GeoPandas / Shapely / NumPy   (py/analysis_tpls_flask.py)
        │
        ▼
PostgreSQL + PostGIS   (tables: trip, tripleg)   credentials hard-coded in py/importToDB.py
```

Data flow for one trip:

1. User picks a name (1–4) and a mode, taps Start. `navigator.geolocation.watchPosition` appends `[usr, mode, utcTimeString, lat, lon, accuracy]` to `localStorage.trackpoints`.
2. On End Trip, the whole array is POSTed to Flask.
3. Flask: parse times → GeoDataFrame → drop accuracy ≥ 500 m → drop duplicates → reproject to LV95 (EPSG:2056) → split into triplegs by mode → flag rush hour → look up mobitool MJ/pkm and kgCO₂/pkm factors → multiply by leg length → insert rows.
4. History page: POST user+date → Flask queries PostGIS → returns `[mj, co2, km, [h, m, s]]` plus GeoJSON of the legs → Leaflet draws them coloured by mode.

The computation is small and simple: a few hundred GPS points per trip, straight-line distances, a 9-row lookup table. Nothing here needs a server.

### Emission factors currently in code (mobitool.ch, per passenger-km)

| mode id | mode | MJ/pkm rush hour | MJ/pkm normal | kg CO₂/pkm rush hour | kg CO₂/pkm normal |
|---|---|---|---|---|---|
| 1 | Car | 3.2 | 3.2 | 0.19 | 0.19 |
| 2 | Train | 0.22 | 0.51 | 0.003 | 0.007 |
| 3 | Bus | 0.82 | 1.79 | 0.016 | 0.037 |
| 4 | Tram | 0.50 | 1.18 | 0.007 | 0.016 |
| 5 | E-bike | 0.45 | 0.45 | 0.024 | 0.024 |
| 6 | CO₂-neutral (walk, bike) | 0 | 0 | 0 | 0 |

Rush hour is defined as 07:00–10:00 and 16:30–19:30. These values should be re-checked against the current mobitool factor sheet during the rewrite and stored with a source/year field.

### Confirmed bugs

Calculation bugs (these change the numbers shown to the user):

| # | Where | Problem | Effect |
|---|---|---|---|
| C1 | `analysis_tpls_flask.py` `categorise()` | `time > 07:00 OR time < 10:00` is always true (should be AND) | Every leg is treated as rush hour; train/tram/bus consumption is under-reported by roughly 2× |
| C2 | `main.js` `startSuccess()` + `toDateTime()` | Timestamps are UTC strings, compared against local-time rush-hour windows | Boundaries shifted by 1 h (winter) / 2 h (summer) |
| C3 | `createTriplegs()` | Loop skips the first point of each new leg, drops the last two points of the trip, and loses the final leg if a mode switch happens near the end | Distances under-reported; short final legs vanish |
| C4 | `main.js` click handlers `#start-tram` / `#start-bus` / `#switch-tram` / `#switch-bus` | Tram writes mode 3 (bus), Bus writes mode 4 (tram); labels also swapped | Tram trips computed with bus factors and vice versa |
| C5 | `exportFromDB.py` `emissions()` | Travel time = last end − first start of the day; query has no ORDER BY | Gaps between trips counted as travel; first/last rows arbitrary |
| C6 | `main.js` Start / Switch | Each call registers a new `watchPosition` without clearing the previous | Duplicate trackpoints (partly hidden by `drop_duplicates`) |
| C7 | `read_data()` | Only filter is accuracy < 500 m; no minimum-displacement or speed check | GPS jitter while standing still adds phantom distance |

Functional bugs:

| # | Where | Problem |
|---|---|---|
| F1 | `main.js` line 9 | `localStorage.clear()` on every load: a tab reload mid-trip loses the trip |
| F2 | `index.html` / `main.js` | HTML id `switch-to-car`, JS selector `switch-car`: switching to car does nothing |
| F3 | `feedback.js` | `L.geoJSON(...).addTo(map)` on every query with no removal: layers pile up |
| F4 | `feedback.js` | `traj.features[0]` crashes on a day with no data; `emissions()` crashes on an empty query |
| F5 | `feedback.js` | Summary text says "grams" of CO₂ but the value is kg |
| F6 | `feedback.html` | Date picker hard-limited to 2022-11-25 … 2022-12-22 |
| F7 | `exportFromDB.py` `query()` | SQL built by string concatenation (injection) |
| F8 | `app.py` `/send` | `response = None` then `response.headers[...]` → crash |
| F9 | `app.py` `/feedback` | Database queried twice per request |
| F10 | `main.js` | `start_bool`, `drop_id`, `errMsg` used undeclared; `#error-messages` element does not exist |
| F11 | `about.html` | references `js/about.js`, which does not exist |

Dead weight to remove: jQuery UI (three CSS files + minified JS, unused), GoogleMutant plugin (unused), Font Awesome (unused), Leaflet loaded at 1.4.0, 1.6.0 and 1.7.1 in the same page, commented-out CSV export.

---

## 1. Modern UI stack

### Recommendation

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Zero-config dev server, one-command production build, first-class GitHub Pages story |
| UI framework | **React 19 + TypeScript** | Largest ecosystem and the most examples/AI assistance available; TypeScript catches the class of bugs above (wrong ids, undefined globals, unit mix-ups) at compile time |
| Map | **Mapbox GL JS v3** via **react-map-gl** | WebGL vector rendering: smooth pan/zoom/rotate, 60 fps live trace updates, built-in follow-me control, data-driven line colours. Details below |
| Geo helpers | **@turf/distance**, **@turf/length**, **@turf/bbox** | Haversine distance and bounding boxes in the same GeoJSON dialect Mapbox consumes |
| Styling | **Tailwind CSS v4** | Replaces eight hand-written CSS files; mobile-first utilities; no naming decisions |
| Routing | **react-router** with `createHashRouter` | Hash routing avoids the GitHub Pages 404-on-refresh problem with zero config |
| State | **zustand** (one small store) | Trip-in-progress, selected user, selected mode; persisted to IndexedDB |
| Local storage | **Dexie** (IndexedDB) | Typed tables for trips / triplegs / trackpoints; survives reloads (fixes F1); far larger than localStorage |
| Charts (optional) | **Recharts** | Weekly/monthly consumption bars on the history page |
| Tests | **Vitest** | Unit tests for the calculation engine |
| PWA | **vite-plugin-pwa** | "Add to Home Screen" on iOS/Android, offline shell, app icon |

Alternative considered: **SvelteKit** has less boilerplate and would also work well. React is recommended because there is more help available for it and the app is small enough that boilerplate is not a real cost.

### Proposed structure

```
trip-consumption-analysis/
├── index.html                  Vite entry
├── package.json
├── vite.config.ts              base: '/trip-consumption-analysis/'
├── .env.example                VITE_MAPBOX_TOKEN=pk.…   (real .env is git-ignored)
├── public/
│   ├── icons/                  PWA icons
│   └── data/history/           (optional) exported 2022 trips as GeoJSON, one file per user
├── src/
│   ├── main.tsx
│   ├── App.tsx                 router + layout
│   ├── pages/
│   │   ├── TrackPage.tsx       map + start/switch/end (replaces index.html)
│   │   ├── HistoryPage.tsx     date + user picker, map, totals (replaces feedback.html)
│   │   └── AboutPage.tsx
│   ├── components/
│   │   ├── MapView.tsx         react-map-gl <Map> wrapper: Standard style, token, GeolocateControl, NavigationControl
│   │   ├── TraceLayer.tsx      <Source type="geojson"> + <Layer type="line"> coloured by mode
│   │   ├── ModePicker.tsx      one component replaces 12 copy-pasted click handlers
│   │   ├── TrackingBadge.tsx   the blinking icon + "NOT TRACKING" text
│   │   ├── StatsTable.tsx
│   │   │   ├── ProfileName.tsx     one editable name, stored in localStorage (replaces the 4-user dropdown)
│   │   └── LegacyImport.tsx    file picker for the 2022 tripleg CSV (see §3, "2022 data")
│   ├── lib/                    PURE calculation engine, no React, fully unit-tested
│   │   ├── legacyCsv.ts        parse DATA.csv rows: hex-WKB LineString → LV95 → WGS84 → Trip
│   │   ├── lv95.ts             swisstopo approximate LV95 → WGS84 formula (≈ 1 m accuracy, no proj4)
│   │   ├── types.ts            Trackpoint, Tripleg, Trip, Mode, EmissionFactor
│   │   ├── modes.ts            mode ids, labels, colours (single source of truth, fixes C4/F2)
│   │   ├── factors.ts          mobitool table with source + year
│   │   ├── clean.ts            accuracy, dedupe, displacement and speed filters
│   │   ├── triplegs.ts         split by mode (fixes C3)
│   │   ├── distance.ts         haversine along the point sequence
│   │   ├── rushHour.ts         local-time (Europe/Zurich) window check (fixes C1, C2)
│   │   ├── emissions.ts        leg → MJ, kg CO₂
│   │   └── summary.ts          daily totals; travel time = Σ leg durations (fixes C5)
│   ├── storage/
│   │   ├── TripStore.ts        interface: saveTrip, listTrips(date), exportAll, importAll
│   │   └── dexieStore.ts       local, per device (the interface is kept so a remote store could be added later)
│   ├── hooks/
│   │   └── useGeolocation.ts   single watchPosition, cleared on stop (fixes C6)
│   └── store/
│       └── tripStore.ts        zustand: profile name, mode, in-progress trackpoints
├── legacy/                     the current html/js/css/py moved here, untouched, for reference
└── .github/workflows/deploy.yml
```

### UI behaviour changes worth making while porting

- One `ModePicker` component driven by the `modes.ts` table instead of twelve hand-written click handlers.
- Keep the in-progress trip in IndexedDB on every fix, so a reload or crash resumes the trip.
- Show the live trace on the tracking map as a GeoJSON line source that is updated on every fix (`setData`, no re-render of the map), plus Mapbox's `GeolocateControl` in `trackUserLocation` mode for the "follow me" puck and accuracy circle.
- "End trip" shows the computed summary immediately, no server round-trip.
- History page: one GeoJSON source whose data is swapped per query (fixes F3 by construction); `fitBounds` to the day's legs with padding; empty day shows a message instead of crashing; date limits derived from stored data.
- Mode colours come from one `match` expression on the `mode` property, defined once in `modes.ts` and used by both the map layer and the legend.
- Request `navigator.wakeLock` while tracking so Android keeps the screen (and GPS) alive. Note the honest limitation: iOS Safari suspends `watchPosition` when the screen locks; a PWA does not fully fix this. Document it on the About page.

### Map layer: Mapbox GL JS

What you get over Leaflet:

- Vector tiles rendered in WebGL: fluid zoom, rotation, pitch, retina-crisp labels. Mapbox Standard or Streets/Outdoors styles look good on a phone without any tuning.
- Reactive data: a GeoJSON source is updated in place (`source.setData`), so the live trace redraws at every GPS fix without touching React state for the map itself. react-map-gl's `<Source data={geojson}>` does this diffing for you.
- `GeolocateControl` handles the location puck, accuracy ring, heading and auto-follow. This replaces the hand-rolled `drawMarkers` / `setView` code.
- Data-driven styling: `line-color: ['match', ['get','mode'], 1,'#000', 2,'#f00', …]` and `line-width` by zoom, no per-feature style callbacks.
- Nice-to-haves later: 3D terrain on the history page, animated "replay" of a trip along the line.

What to be aware of:

| Topic | Detail |
|---|---|
| Access token | Required. Create a **public** token (`pk.…`) in the Mapbox dashboard and restrict its allowed URLs to `https://<github-user>.github.io/*` and `http://localhost:*`. A public token in a static site is expected; URL restriction is what protects your quota. |
| Cost | Mapbox has a free monthly allowance for web map loads (historically 50 000 loads/month) that a four-person app will never approach. Verify the current pricing page once before Phase 4. |
| Token in the build | Read from `import.meta.env.VITE_MAPBOX_TOKEN`. Locally from `.env`; in CI from a repository secret injected into the build step (see §3 workflow). |
| Bundle size | Mapbox GL JS is roughly 10× the size of Leaflet (hundreds of KB gzipped). Acceptable for a PWA that caches its shell; load it once at app start rather than per page. |
| Offline | Vector tiles are not cached offline by the service worker. The app shell and stored trips work offline; the basemap needs a connection. Tracking itself does not need the map to be visible. |
| React binding | Use `react-map-gl` and import from `react-map-gl/mapbox` (v8+). Pass `mapboxAccessToken` once on `<Map>`. |
| Fallback | If you ever want to drop the token dependency, **MapLibre GL JS** is the API-compatible open-source fork; `react-map-gl/maplibre` is a one-line switch and free tile sources (OpenFreeMap, MapTiler free tier) exist. Design `MapView.tsx` so nothing outside it knows which engine is used. |

---

## 2. Calculation engine

### Decided: compute in the browser

The whole pipeline is a few hundred points × a 9-row lookup. Porting it to a pure TypeScript module in `src/lib/`:

- removes the Flask + GeoPandas + PostGIS dependency, which is what blocks static hosting;
- makes results instant on "End trip";
- makes the logic unit-testable with fixtures, which is how the bugs above get fixed and stay fixed.

No Python remains in the new project. The 2022 data is a CSV and is imported by the app itself (see §3).

### Module-by-module spec

**`clean.ts`** — input: raw trackpoints. Steps, in order:
1. Drop points with `accuracy > 500 m` (keep the current threshold; make it a constant).
2. Drop exact duplicates (same time or same coordinates as the previous point).
3. Minimum-displacement filter: drop a point if its distance to the last kept point is less than `max(accuracy_prev, accuracy_curr)`. This removes GPS jitter while standing still (fixes C7).
4. Speed sanity: drop a point if the implied speed from the last kept point exceeds a per-mode ceiling (car 200 km/h, train 320, bus/tram 120, e-bike 60, neutral 40).

**`triplegs.ts`** — group consecutive points by mode. Every point belongs to exactly one leg; the first point of a new leg is the first point with the new mode (fixes C3). A leg with fewer than 2 points is dropped and logged. Leg start = first point time, end = last point time.

**`distance.ts`** — haversine between consecutive points, summed (`@turf/distance`, or `@turf/length` on the leg's LineString). Straight-line error vs the current LV95 projection is well under 0.1 % inside Switzerland, so no proj4 dependency is needed. Legs are stored as GeoJSON `LineString` features so the same object feeds Turf, Dexie and the Mapbox source.

**`rushHour.ts`** — convert the fix timestamp to `Europe/Zurich` wall-clock time (use `Intl.DateTimeFormat` with `timeZone` or `date-fns-tz`), then `(07:00 ≤ t < 10:00) || (16:30 ≤ t < 19:30)` (fixes C1, C2). Evaluate per leg using the leg's start time, as today; document that choice.

**`factors.ts`** — the table as data, with `source: 'mobitool.ch'`, `version`, `year`, and `perPassengerKm: true`. Values are refreshed from the current mobitool factor sheet (see `docs/mobitool-factors.md`, produced during Phase 1) rather than copied from the 2022 code.

**`emissions.ts`** — `MJ = km × factor.mj`, `kgCO2 = km × factor.co2`. No per-leg rounding; round only for display.

**`summary.ts`** — for a date: total km, MJ, kg CO₂, and travel time = Σ (leg.end − leg.start) (fixes C5). Also per-mode breakdown, which the current UI cannot show but the history page should.

### Tests (Vitest, in `src/lib/__tests__/`)

- Fixture: one recorded trip JSON (record one with the new app, or synthesise: walk → tram → walk).
- `triplegs`: N points with a mode switch at index k → 2 legs, point counts k and N−k.
- `rushHour`: 06:59, 07:00, 09:59, 10:00 Zurich time, in January and July (DST).
- `clean`: a stationary cluster of 50 jittery points → ≤ 2 points kept.
- `summary`: two trips on one day with a 6 h gap → travel time excludes the gap.
- Regression: the swapped tram/bus ids can never recur because `modes.ts` is the only place ids and labels are defined, and a test asserts the table has exactly six unique entries.

### If you ever keep the Python side

Not recommended, but for the record: replace the `iterrows` + `_set_value` loops with `pd.to_datetime(df.time, utc=True).dt.tz_convert('Europe/Zurich')`, vectorised `np.select`, and `groupby((mode != mode.shift()).cumsum())` for triplegs; use parameterised SQL. The same seven calculation bugs apply.

---

## 3. Hosting

Geolocation requires HTTPS, which GitHub Pages provides. The only obstacle is the backend, and §2 removes it.

### Option A (chosen): GitHub Pages, fully static, data on device

- Trips are stored in the browser (IndexedDB via Dexie) on the phone that recorded them.
- Export / import as JSON (and optionally GPX) so data can be moved between devices or backed up.
- 2022 data: the history page gets an "Import 2022 CSV" button that reads `DATA.csv` directly in the browser. Format found: columns `mode_type_id, tot_mj, tot_co2, trip_id, user_id, geometry, start_time, date, length, length`; geometry is hex WKB (`0102000000…`, LineString, no SRID) in LV95 (EPSG:2056); `start_time` like `21.12.22 22:07`; the two `length` columns are metres and km. There is **no end time**, so legs from 2022 have unknown duration: distance, MJ and CO₂ are recomputed with the refreshed factors and the corrected rush-hour rule (from `start_time`), travel time is shown as "n/a" for those trips. The importer asks which `user_id` to import (1 Dario, 2 Luca, 3 Leo, 4 Raúl) and skips rows already imported (key: `trip_id` + `user_id` + row index). The CSV is never committed to the repo.
- "Multi-device history" would mean seeing on a laptop the trips recorded on a phone, automatically. Not needed; export/import covers a phone change.
- Cost: zero. Setup: one workflow file and one repo setting.

Deploy workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_MAPBOX_TOKEN: ${{ secrets.MAPBOX_TOKEN }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Repo settings → Pages → Source: **GitHub Actions**. Repo settings → Secrets and variables → Actions → new secret `MAPBOX_TOKEN` with the URL-restricted public token. `vite.config.ts` needs `base: '/trip-consumption-analysis/'`. The site will be at `https://<github-user>.github.io/trip-consumption-analysis/`.

### Option B: GitHub Pages + Supabase (not planned)

Kept for reference in case shared history is ever wanted. Same static frontend; swap `dexieStore.ts` for `supabaseStore.ts` behind the `TripStore` interface. Supabase's free tier is Postgres with PostGIS, so the existing `tripleg` table can be imported almost unchanged. Use magic-link auth and row-level security so users see only their own trips. Adds an account and a public anon key in the frontend; no server code to run.

### Option C: keep the Python backend (dropped)

Ruled out by the browser-only decision. For the record: would need a host for Flask (Render, Fly.io) plus a managed PostGIS (Neon, Supabase), secrets management, CORS done properly, and cold-start latency on free tiers. Most work, only worth it if you want to run heavier analysis server-side. Not recommended.

### Why A

No shared or multi-device history is needed, so there is nothing for a backend to do. The storage interface stays so B remains a swap if that ever changes.

---

## 4. Phased roadmap

Branching: each phase is committed on its own branch, branched from the previous phase's branch. Nothing is pushed until explicitly requested.

### Phase 0 — Hygiene (½ day) — branch `refactor/00-hygiene`
- Move `index.html`, `feedback.html`, `about.html`, `js/`, `css/`, `py/` into `legacy/`.
- Add `.gitignore` (node_modules, dist, .env), `.env.example` with `VITE_MAPBOX_TOKEN=`, `LICENSE` stays.
- Create the Mapbox account/token and restrict its URLs (5 minutes, needed from Phase 2 on).
- Strip credentials placeholder from `legacy/py/importToDB.py` into an `.env.example` note.
- Done when: repo root contains only `legacy/`, `docs/`, `README.md`, `LICENSE`.

### Phase 1 — Scaffold + calculation engine (1–2 days) — branch `refactor/01-scaffold-engine`
- `npm create vite@latest` (React + TypeScript), add Tailwind, Vitest, Dexie, zustand, react-router, `mapbox-gl`, `react-map-gl`, `@turf/distance`, `@turf/length`, `@turf/bbox`.
- Implement `src/lib/*` per §2 with tests. Fill `factors.ts` from the refreshed mobitool values in `docs/mobitool-factors.md`.
- Done when: `npm test` passes and a fixture trip produces km / MJ / CO₂ / time that you have hand-checked once.

### Phase 2 — Tracking page (1–2 days) — branch `refactor/02-tracking`
- `MapView` (Mapbox style, token, `GeolocateControl` with `trackUserLocation`, `NavigationControl`), `TraceLayer` fed by a GeoJSON source that grows with each fix.
- `useGeolocation` hook (single watcher, cleanup on stop), `ModePicker`, `TrackingBadge`.
- Persist in-progress trip to IndexedDB on every fix; resume on reload.
- End trip → run engine → save `Trip` + `Tripleg[]` → show summary sheet.
- Done when: a real walk around the block recorded on a phone shows a plausible distance and survives a tab reload mid-trip.

### Phase 3 — History page + storage + 2022 import (1 day) — branch `refactor/03-history`
- `TripStore` interface + Dexie implementation; date picker; map with mode-coloured legs (one source, data swapped per query, `fitBounds` to the day); totals table; per-mode breakdown.
- JSON export/import.
- `lib/lv95.ts` + `lib/legacyCsv.ts` with tests against a synthetic WKB fixture (not real data); `LegacyImport` component on the history page.
- Done when: yesterday's recorded trip appears on the history page with correct totals; empty days show a message.

### Phase 4 — Deploy + PWA (½ day) — branch `refactor/04-deploy`
- `vite.config.ts` base path, workflow file, Pages setting, `MAPBOX_TOKEN` repo secret, `vite-plugin-pwa` with manifest + icons (exclude Mapbox tile requests from the service-worker cache).
- Update `README.md`: live URL, how to run locally, how the numbers are computed, known mobile limitations.
- Done when: the app installs to a phone home screen from the GitHub Pages URL and tracks a trip.

### Phase 5 — Optional
- Weekly/monthly charts (Recharts).
- Trip replay animation and 3D terrain on the history map (Mapbox features, cosmetic).
- GPX export; automatic mode detection from speed profile.
- Re-verify mobitool factors and add a "factors version" shown on the About page.

---

## Open questions

None at the moment. All decisions are listed at the top of this document. Two things only you can do when Phase 2/4 arrive: create the Mapbox public token, and add it as the `MAPBOX_TOKEN` repository secret.
