import type { ModeId } from './types'

/**
 * Emission and energy factors per passenger-km, from the Swiss mobitool
 * factor set (SBB, Swisscom, Post, öbu, EnergieSchweiz/BFE, BAFU; v3.x
 * computed by the Paul Scherrer Institute for FOEN).
 *
 * Scope: full life cycle ("sum" column) — direct operation, non-exhaust,
 * energy chain, vehicle production/maintenance/end-of-life and road/rail
 * infrastructure — at mobitool's annual-average load factors.
 * - mjPerPkm: non-renewable primary energy, MJ per passenger-km
 * - kgCo2PerPkm: GWP100a, kg CO2-eq per passenger-km
 *
 * mobitool publishes no rush-hour / peak-occupancy variant, so `rushHour`
 * equals `normal` for every mode. The two slots are kept so a derived
 * peak-occupancy value can be added later without touching the engine.
 *
 * Row choices and caveats (no official "average bus" row exists; MJ values
 * for car, bus and e-bike are recomputed from mobitool's own inventory and
 * formulas) are documented in docs/mobitool-factors.md.
 */
export const FACTOR_SET = {
  source: 'mobitool.ch',
  version: 'v3.1 (2025-04-08)',
  accessed: '2026-09-14',
  url: 'https://www.energieschweiz.ch/programme/umweltrechner-verkehr/',
  scope: 'full life cycle, non-renewable primary energy / GWP100a',
} as const

export interface EmissionFactor {
  mode: ModeId
  label: string
  /** mobitool row the values were taken from (documentation only) */
  mobitoolRow?: string
  mjPerPkm: { normal: number; rushHour: number }
  kgCo2PerPkm: { normal: number; rushHour: number }
}

export const FACTORS: readonly EmissionFactor[] = [
  {
    mode: 1,
    label: 'Car',
    mobitoolRow: 'Passenger car / fleet average (load 1.6 pax)',
    mjPerPkm: { normal: 4.474, rushHour: 4.474 },
    kgCo2PerPkm: { normal: 0.1864, rushHour: 0.1864 },
  },
  {
    mode: 2,
    label: 'Train',
    mobitoolRow: 'Train Switzerland / SBB electricity mix / average regional & long-distance (load 159.4 pax)',
    mjPerPkm: { normal: 0.177, rushHour: 0.177 },
    kgCo2PerPkm: { normal: 0.00703, rushHour: 0.00703 },
  },
  {
    mode: 3,
    label: 'Bus',
    mobitoolRow: 'City bus (13 m) / diesel / single deck (load 10 pax)',
    mjPerPkm: { normal: 3.431, rushHour: 3.431 },
    kgCo2PerPkm: { normal: 0.1338, rushHour: 0.1338 },
  },
  {
    mode: 4,
    label: 'Tram',
    mobitoolRow: 'Tram / fleet average (load 33.6 pax)',
    mjPerPkm: { normal: 1.45, rushHour: 1.45 },
    kgCo2PerPkm: { normal: 0.04279, rushHour: 0.04279 },
  },
  {
    mode: 5,
    label: 'E-Bike',
    mobitoolRow: 'E-Bike / battery electric / <25 km/h (Pedelec)',
    mjPerPkm: { normal: 0.242, rushHour: 0.242 },
    kgCo2PerPkm: { normal: 0.01133, rushHour: 0.01133 },
  },
  {
    mode: 6,
    label: 'CO₂-neutral',
    mobitoolRow: 'On foot (0 in every category); bicycle set to 0 by app definition',
    mjPerPkm: { normal: 0, rushHour: 0 },
    kgCo2PerPkm: { normal: 0, rushHour: 0 },
  },
]

export function getFactor(
  mode: ModeId,
  factors: readonly EmissionFactor[] = FACTORS,
): EmissionFactor {
  const factor = factors.find((f) => f.mode === mode)
  if (!factor) {
    throw new Error(`No emission factor for mode ${mode}`)
  }
  return factor
}
