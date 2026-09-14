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
