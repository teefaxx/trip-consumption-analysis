import type { ModeId } from './types'

export type ModeKey = 'car' | 'train' | 'bus' | 'tram' | 'ebike' | 'neutral'

export interface Mode {
  id: ModeId
  key: ModeKey
  label: string
  color: string
  /** Ceiling used by the speed-sanity filter in clean.ts */
  maxSpeedKmh: number
}

/**
 * The single source of truth for mode ids, labels and colours.
 *
 * The legacy app swapped the tram (3) and bus (4) ids/labels between two of
 * its twelve hand-written click handlers (bug C4/F2 in docs/modernization-plan.md).
 * Because every part of this app reads mode metadata from this table, that
 * class of bug cannot recur.
 */
export const MODES: Record<ModeId, Mode> = {
  1: { id: 1, key: 'car', label: 'Car', color: '#111827', maxSpeedKmh: 200 },
  2: { id: 2, key: 'train', label: 'Train', color: '#dc2626', maxSpeedKmh: 320 },
  3: { id: 3, key: 'bus', label: 'Bus', color: '#2563eb', maxSpeedKmh: 120 },
  4: { id: 4, key: 'tram', label: 'Tram', color: '#0ea5e9', maxSpeedKmh: 120 },
  5: { id: 5, key: 'ebike', label: 'E-Bike', color: '#7c3aed', maxSpeedKmh: 60 },
  6: { id: 6, key: 'neutral', label: 'CO₂-neutral', color: '#059669', maxSpeedKmh: 40 },
}

export const MODE_LIST: Mode[] = [1, 2, 3, 4, 5, 6].map((id) => MODES[id as ModeId])

/**
 * Mapbox GL `match` expression coloring a line layer by its `mode` feature
 * property. Falls back to a neutral grey for anything unexpected.
 */
export function modeColorExpression(modes: Record<ModeId, Mode> = MODES): unknown[] {
  const expr: unknown[] = ['match', ['get', 'mode']]
  for (const mode of Object.values(modes)) {
    expr.push(mode.id, mode.color)
  }
  expr.push('#999999')
  return expr
}
