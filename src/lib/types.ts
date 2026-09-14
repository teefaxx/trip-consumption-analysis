import type { LineString } from 'geojson'

export type ModeId = 1 | 2 | 3 | 4 | 5 | 6

export interface Trackpoint {
  t: number
  lat: number
  lon: number
  acc: number
  mode: ModeId
}

export interface Tripleg {
  mode: ModeId
  startT: number
  endT: number
  points: Trackpoint[] // cleaned points, >= 2
  distanceKm: number
  durationMs: number
  rushHour: boolean
  mj: number
  kgCo2: number
  geometry: LineString // [lon, lat] pairs, for the map and export
}

export interface Trip {
  id: string
  profileName: string
  startT: number
  endT: number
  legs: Tripleg[]
  totals: Totals
  /**
   * Where this trip came from. `'recorded'` trips are produced by
   * `analyzeTrip` from live GPS fixes; `'legacy-csv'` trips are imported
   * from the 2022 `tripleg` CSV export by `parseLegacyCsv`. Recorded trips
   * may leave this undefined (treated the same as `'recorded'`).
   *
   * Legacy 2022 rows carry no end time, so their legs' `durationMs` is
   * always 0 and `totals.travelMs` is always 0 — the UI must show travel
   * time as "n/a" for these trips rather than a bogus "0 min".
   */
  source?: 'recorded' | 'legacy-csv'
}

export interface Totals {
  distanceKm: number
  mj: number
  kgCo2: number
  travelMs: number
  byMode: Partial<
    Record<ModeId, { distanceKm: number; mj: number; kgCo2: number; travelMs: number }>
  >
}
