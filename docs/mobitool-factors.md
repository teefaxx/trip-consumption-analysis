# mobitool factors for trip energy/GHG calculation — research findings

**mobitool factor set found:** mobitool-Faktoren **v3.1**, published **2025-04-08**
**Date accessed:** 2026-09-14

**Source URLs**

- Tool landing page (mobitool.ch permanently redirects here): https://www.energieschweiz.ch/programme/umweltrechner-verkehr/
- Factor workbook (primary source of all numbers in this report): https://assets.ctfassets.net/4y40wxcxzkmz/oVkB45ifGfz5X44f5Omb1/9d3ef33605fb6154d61d7630536c3a92/mobitool-Faktoren-v3.1-20250408.xlsx
- User manual "Gebrauchsanleitung mobitool-Faktoren v3.0" (PDF, DE — indicator definitions): https://assets.ctfassets.net/4y40wxcxzkmz/38i63bjJXJtYF6VTQW1GvT/82ee0f5ce2e7555e7e99e37f43e438a0/mobitool-manual-v3.0_de.pdf
- Underlying methodology report, Sacchi & Bauer 2023, *Life Cycle Inventories for On-Road Vehicles*, PSI (for FOEN): https://downloads.ctfassets.net/4y40wxcxzkmz/5p6HLqNvy0A1ri6P2wiEl3/f4d26e0191c19967ddf5420968203be7/vehiclelca_psi_2023.pdf

mobitool is jointly published by SBB, Swisscom, Die Post, öbu, EnergieSchweiz/BFE and BAFU. The v3.0/v3.1 update (2023–2025) was carried out by the Paul Scherrer Institute (PSI) on behalf of the Federal Office for the Environment (FOEN), on top of the KBOB life-cycle-inventory database (DQRv2:2018, based on ecoinvent v2.2) plus 250+ PSI-specific vehicle datasets.

The published download is a large (~6 MB, 14-sheet) Excel model, not a flat table: a single "Select an indicator" dropdown drives every result cell in the main sheet, and the workbook only ships with **GWP100a (g CO2‑eq.) pre-calculated as the cached/default indicator**. Getting the energy indicator ("Primary energy" / "Primary energy (non-renewable)", in MJ) out of the file required either recalculating the whole spreadsheet in Excel/LibreOffice (unavailable in this environment) or reverse-engineering mobitool's own formulas. See "Methodology used" in the caveats section for exactly what was done and how it was validated.

## Recommended values for the app

Scope of the recommended figures: **full life cycle ("sum")** — direct operation + non‑exhaust + upstream energy chain (fuel/electricity provision) + vehicle production/maintenance/end-of-life + road/rail infrastructure — using indicators **GWP100a** (g CO2‑eq → kg CO2‑eq/pkm) and **Primary energy, non-renewable** (MJ/pkm). This is the headline "sum" metric mobitool itself reports, and it is a materially wider scope than the operation-only figures the 2022 app likely used (see comparison table and caveats).

| mode id | mode | MJ/pkm normal | MJ/pkm rush hour | kg CO2‑eq/pkm normal | kg CO2‑eq/pkm rush hour | scope | mobitool label |
|---|---|---|---|---|---|---|---|
| 1 | Car | 4.474 | 4.474 (same — see note) | 0.1864 | 0.1864 (same — see note) | full life cycle, non-renewable primary energy / GWP100a | "Passenger car / fleet average / fleet average" (load 1.6 pax, load factor 31.1%) |
| 2 | Train | 0.177 | 0.177 (same — see note) | 0.00703 | 0.00703 (same — see note) | full life cycle | "Train Switzerland / Electricity mix SBB / Average regional & long-distance traffic" (load 159.4 pax, load factor 29.3%) |
| 3 | Bus | 3.431 | 3.431 (same — see note) | 0.1338 | 0.1338 (same — see note) | full life cycle | "City bus (13m) / Diesel / Single deck" (load 10 pax, load factor 15.6%) — see caveat, no official bus fleet average exists |
| 4 | Tram | 1.450 | 1.450 (same — see note) | 0.04279 | 0.04279 (same — see note) | full life cycle | "Tram / – / fleet average" (load 33.6 pax, load factor 29.0%) |
| 5 | E-bike | 0.242 | 0.242 (same — see note) | 0.01133 | 0.01133 (same — see note) | full life cycle | "E-Bike / Battery electric / <25 km/h" (Pedelec, load 1, occupancy 100%) |
| 6 | Walking / bicycle | 0 | 0 | 0 | 0 | by app definition (CO2-neutral, unpowered) | n/a — see note below for mobitool's own bicycle figure |

**Note on "rush hour" columns:** mobitool v3.1 publishes exactly **one** load-factor/occupancy assumption per vehicle type (an annual, system-wide average) — it does **not** publish a separate peak/off-peak or rush-hour variant for any mode. A rush-hour-specific number therefore cannot be justified from mobitool data, so normal and rush-hour are set equal above, as instructed. See "How a rush-hour variant could be derived" below for the method and why it is not a simple "always higher occupancy" adjustment.

**Note on mode 6:** the app treats walking and bicycle as 0/0 by definition (human-powered, no fuel/electricity, and the app apparently does not count the athlete's food-energy metabolic overhead). For the record, mobitool's own life-cycle figure for a conventional bicycle (production + maintenance + end-of-life + road infrastructure share; no operating energy) is **0.110 MJ/pkm** and **0.00558 kg CO2‑eq/pkm** — non-zero only because of manufacturing/infrastructure, not use-phase emissions.

## How a rush-hour variant could be derived

mobitool gives, for every vehicle, a **load** (average passengers on board) alongside the per-pkm "sum" value, so a per-vehicle-km value can be recovered and then re-divided by a different occupancy:

```
per-vehicle-km value = per-pkm "sum" value × Load (avg. passengers)
rush-hour per-pkm value = per-vehicle-km value ÷ (assumed rush-hour occupancy)
```

Worked example for the bus (13 m single-deck diesel): 3.431 MJ/pkm × 10 pax = 34.31 MJ/vkm. If rush-hour ridership were, say, 25 passengers instead of the all-day average of 10, rush-hour energy would be 34.31/25 ≈ 1.37 MJ/pkm. **mobitool does not publish that "25 passengers" (or any peak) figure** — it would have to come from an external source (e.g. an SBB/PostAuto/VBZ capacity-utilization report or the Swiss Mikrozensus Mobilität und Verkehr), so no such number is presented here as a mobitool-sourced fact.

Also note the direction is **not uniform across modes**: for public transport (train/bus/tram), rush hour usually means *higher* occupancy than the daily average → *lower* per-passenger footprint. For the car, rush hour is dominated by single-occupant commuting and is typically *lower* occupancy than the all-day average (which includes leisure/family trips) → footprint per passenger would if anything be *higher*, not lower, at rush hour. The 2022 app's own table is consistent with this for the car (it already used the same value for both columns).

## Comparison: old (2022 app) vs new (mobitool v3.1, recommended "sum" scope)

| mode | old MJ/pkm (normal) | new MJ/pkm (normal) | MJ % change | old kg CO2/pkm (normal) | new kg CO2/pkm (normal) | CO2 % change |
|---|---|---|---|---|---|---|
| Car | 3.20 | 4.474 | **+39.8%** | 0.190 | 0.1864 | **−1.9%** |
| Train | 0.51 | 0.177 | **−65.2%** | 0.007 | 0.00703 | **+0.4%** |
| Bus | 1.79 | 3.431 | **+91.7%** | 0.037 | 0.1338 | **+261.7%** |
| Tram | 1.18 | 1.450 | **+22.9%** | 0.016 | 0.04279 | **+167.5%** |
| E-bike | 0.45 | 0.242 | **−46.2%** | 0.024 | 0.01133 | **−52.8%** |
| Walking/bicycle | 0 | 0 | n/a | 0 | 0 | n/a |

The large swings for bus and tram are **not evidence that Swiss buses/trams got "dirtier"** — they are almost entirely a scope and occupancy artifact (see caveats): the new figures are full life-cycle (production, maintenance, infrastructure included) at mobitool's default ~15–29% load factor, whereas the 2022 app's much lower bus/tram values imply either an operation-only scope, a materially higher assumed occupancy, or both. The train's large MJ drop reflects mobitool crediting Swiss rail traction power with a low non-renewable-primary-energy footprint (SBB's traction mix is predominantly hydro).

### Supplementary: direct/operation-only scope (for a closer read on what the 2022 figures might represent)

If the app instead wants a "tank/battery-to-wheel, operation only" number (tailpipe/traction energy and emissions only, excluding vehicle production, maintenance, EoL and infrastructure), mobitool's "direct" column gives:

| mode | MJ/pkm (direct only) | kg CO2‑eq/pkm (direct only) |
|---|---|---|
| Car | 1.504 | 0.1104 |
| Train | 0.0311 | 0.0000518 |
| Bus (13m single-deck diesel) | 1.283 | 0.0945 |
| Tram | 0.311 | 0.000375 |
| E-bike | 0.0191 | 0 |
| Walking/bicycle | 0 | 0 |

These are **not** the recommended values (see scope discussion below) but are provided because they sit closer in magnitude to some of the 2022 figures for car and bus and may be a better match to what that table originally intended.

## Notes and caveats

**Scope choice.** mobitool's "sum" column (full life cycle: direct + non-exhaust + energy chain + maintenance + vehicle + end-of-life + road/rail infrastructure) was chosen as the recommended default because it is mobitool's own headline metric and the standard modern practice for comparing transport modes on equal footing (a car's fuel-only footprint is not directly comparable to an EV's, without embodied/upstream accounting). The "direct-only" alternative is given above for anyone who prefers operation-only figures closer to the apparent 2022 scope. **This is a judgement call, not a mobitool prescription** — mobitool itself does not tell users which column to prefer for an app like this.

**Energy indicator choice.** mobitool offers both "Primary energy" (total, incl. renewable) and "Primary energy (non-renewable)". This report recommends **non-renewable primary energy** (the more commonly cited "footprint" style energy metric, analogous to non-renewable cumulative energy demand). Total primary energy sums (same full-life-cycle scope) were also computed and are available if preferred: Car 4.736, Train 0.506, Bus (13 m single-deck diesel) 3.641, Tram 1.789, E-bike 0.269, Bicycle 0.110 MJ/pkm.

**No official "bus fleet average" exists in mobitool v3.1.** The workbook has detailed rows by bus size/deck/powertrain (9 m midibus, 13 m single/double-deck, 18 m articulated; diesel, hybrid diesel, compressed gas, battery-electric depot/opportunity charging, fuel-cell) but no aggregate "average Swiss bus." "City bus (13 m) / Diesel / Single deck" was chosen as the most representative single row for a generic diesel/mixed urban bus. As an alternative, "City bus (9 m) Midibus / Diesel" gives 4.417 MJ/pkm (non-renewable, sum) and 0.1716 kg CO2‑eq/pkm (sum) — noticeably higher because of its lower average load (5 passengers, 14.7% load factor) and smaller vehicle. If the app's "Bus" concept is meant to include electric/trolley buses (increasingly common in Swiss cities), the diesel-only figure above will understate how green a modern Swiss urban bus fleet actually is; that split was out of scope here.

**Train row choice.** mobitool splits Swiss rail into "Regional traffic incl. S-Bahn" (0.223 load factor), "Regional transport, S-Bahn only" (0.262), "Long-distance traffic" (0.326), and "Average regional & long-distance traffic" (0.293, load 159.4 pax). The last (blended) row was used as the best single match for a general "Train" mode; the individual regional/S-Bahn/long-distance figures are in the workbook if the app ever wants to split by service type.

**Methodology used to obtain the MJ/pkm figures (important, please read).** The downloaded Excel file only ships with GWP100a (CO2) pre-calculated in its cached cell values; the energy indicators require re-running the workbook's internal formulas with the indicator selector changed, which needs Excel or LibreOffice (neither was available in this environment; a Python "formulas" library attempt to fully recalculate the workbook did not finish in reasonable time and was aborted).

Instead:
- **Tram and Train** MJ/pkm figures were read directly from the workbook's "other vehicles" sheet, which stores separate pre-computed rows per indicator (including "Primary energy" and "Primary energy (non-renewable)") for these vehicle types — no recomputation needed. Cross-checking this sheet's cached GWP100a rows against the main sheet's live GWP100a formulas showed a ≤1% discrepancy (a stale-cache artifact, immaterial here).
- **Car, Bus and Bicycle/E-bike** MJ/pkm figures were **not** available pre-computed for any energy indicator anywhere in the workbook. They were derived by reading the workbook's underlying life-cycle-inventory flow quantities (physical amounts per process category: direct, non-exhaust, energy chain, maintenance, vehicle, end-of-life, road) and mobitool's own substance-level characterization-factor table (same workbook, "characterization factors" sheet), then reproducing — in Python — mobitool's own Excel formulas that combine the two, including the special-case fuel/electricity energy terms used only for the "Primary energy" and "Primary energy (non-renewable)" indicators. The car fleet-average figure additionally required replicating the workbook's own fleet-weighting formula (a weighted sum over ~170 individual powertrain/size variants using mobitool's own fleet-mix weights). **This re-implementation was validated**, not just trusted: for the same method applied to the GWP100a indicator (which *is* cached in the sheet and could be checked), it reproduced mobitool's cached "direct" and "sum" values exactly for the bus and bicycle rows, and within 0.1% for the fleet-weighted car row. No number in this report was invented — every figure traces to a concrete cell or formula in mobitool's own v3.1 workbook — but the MJ/pkm figures for car/bus/bicycle/e-bike are Claude's independent recomputation of mobitool's formulas, not a value mobitool itself ships pre-calculated. Anyone needing an authoritative, Excel-verified number should open the workbook in Excel/LibreOffice, set cell `vehicle_specs!B2` (or the "Select an indicator" dropdown on the `mobitool-Faktoren-v3.1` sheet) to "Primary energy (non-renewable)", and re-read the "sum"/"direct" columns for the relevant row.
- Full detail: raw LCI flow columns are `vehicle_specs!DJ:HF…` (137 physical-flow columns, category tagged in row 9 and substance tagged in row 11 of the corresponding `IR:NX` block, offset −138 columns); characterization factors are `'characterization factors'!$A$2:$K$156`; the electricity-specific extra terms (for battery/overhead-line consumption) use `'electricity'!$B$4:$AD$7` (Swiss "Consumer mix (physical)": 128 g CO2‑eq/kWh, 9.401 MJ primary energy/kWh, 7.286 MJ non-renewable primary energy/kWh — this matches the mobitool v3.0 manual's own quoted figure of "128 g CO2‑eq./kWh" for the consumer mix); fuel LHV/density/non-renewable-share constants are `'fuels and tailpipe emissions'!$L$3:$T$5`; the car fleet weights are `fleet!$E$33:$E$205` applied to `vehicle_specs!NZ$40:NZ$212` (and the OA:OF equivalents).

**Things not found / not available from mobitool:**
- A rush-hour or any peak/off-peak occupancy variant — not published by mobitool v3.1 for any mode (see dedicated section above).
- A single "average Swiss bus" or "average Swiss car by occupancy period" row — not published; representative rows were chosen instead (documented above).
- An Excel/LibreOffice-verified (rather than independently recomputed) MJ/pkm figure for car, bus, bicycle and e-bike — not obtainable in this environment; see methodology note above for exactly what was substituted and how it was validated.
- A "walking" energy/emissions figure beyond 0 — mobitool's own "On foot" row is 0 across every category and every indicator, consistent with the app's existing definition.

## TypeScript snippet

```typescript
export const FACTOR_SET = {
  source: 'mobitool.ch',
  version: 'v3.1 (2025-04-08)',
  accessed: '2026-09-14',
  url: 'https://assets.ctfassets.net/4y40wxcxzkmz/oVkB45ifGfz5X44f5Omb1/9d3ef33605fb6154d61d7630536c3a92/mobitool-Faktoren-v3.1-20250408.xlsx',
} as const;

// mjPerPkm: MJ of non-renewable primary energy per passenger-km (full life cycle: direct
// operation + energy chain + vehicle production/maintenance/EoL + infrastructure).
// kgCo2PerPkm: kg CO2-eq per passenger-km (GWP100a, same full life-cycle scope).
// mobitool does not publish a rush-hour/peak occupancy variant, so normal === rushHour
// for every mode below (see docs/mobitool-factors.md for how a rush-hour figure could be
// derived from mobitool's per-vehicle-km + load-factor data, given an external occupancy
// assumption).
export const FACTORS = [
  {
    mode: 1,
    label: 'Car',
    mjPerPkm: { normal: 4.474, rushHour: 4.474 },
    kgCo2PerPkm: { normal: 0.1864, rushHour: 0.1864 },
  },
  {
    mode: 2,
    label: 'Train',
    mjPerPkm: { normal: 0.177, rushHour: 0.177 },
    kgCo2PerPkm: { normal: 0.00703, rushHour: 0.00703 },
  },
  {
    mode: 3,
    label: 'Bus',
    mjPerPkm: { normal: 3.431, rushHour: 3.431 },
    kgCo2PerPkm: { normal: 0.1338, rushHour: 0.1338 },
  },
  {
    mode: 4,
    label: 'Tram',
    mjPerPkm: { normal: 1.450, rushHour: 1.450 },
    kgCo2PerPkm: { normal: 0.04279, rushHour: 0.04279 },
  },
  {
    mode: 5,
    label: 'E-bike',
    mjPerPkm: { normal: 0.242, rushHour: 0.242 },
    kgCo2PerPkm: { normal: 0.01133, rushHour: 0.01133 },
  },
  {
    mode: 6,
    label: 'Walking / bicycle (CO2-neutral, by app definition)',
    mjPerPkm: { normal: 0, rushHour: 0 },
    kgCo2PerPkm: { normal: 0, rushHour: 0 },
  },
] as const;
```
