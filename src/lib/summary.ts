import type { ModeId, Totals, Tripleg } from './types'

/**
 * Totals across a set of legs. `travelMs` is the sum of each leg's own
 * duration, not `lastEnd - firstStart` — the legacy `exportFromDB.py`
 * `emissions()` used the latter, which counts gaps between trips as travel
 * time (bug C5).
 */
export function summarize(legs: readonly Tripleg[]): Totals {
  const totals: Totals = { distanceKm: 0, mj: 0, kgCo2: 0, travelMs: 0, byMode: {} }

  for (const leg of legs) {
    totals.distanceKm += leg.distanceKm
    totals.mj += leg.mj
    totals.kgCo2 += leg.kgCo2
    totals.travelMs += leg.durationMs

    const bucket = totals.byMode[leg.mode] ?? {
      distanceKm: 0,
      mj: 0,
      kgCo2: 0,
      travelMs: 0,
    }
    bucket.distanceKm += leg.distanceKm
    bucket.mj += leg.mj
    bucket.kgCo2 += leg.kgCo2
    bucket.travelMs += leg.durationMs
    totals.byMode[leg.mode as ModeId] = bucket
  }

  return totals
}

/** Formats a duration in ms as "1 h 05 min" (>= 1 h) or "12 min 30 s" (< 1 h). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, '0')} min`
  }
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`
}
