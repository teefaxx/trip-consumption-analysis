import { haversineKm } from './distance'
import { MODES, type Mode } from './modes'
import type { ModeId, Trackpoint } from './types'

export interface CleanOptions {
  /** Points with accuracy worse (larger) than this, in metres, are dropped. */
  maxAccuracyM?: number
  /** Per-mode metadata, used for the speed-sanity ceiling. */
  modes?: Record<ModeId, Mode>
}

const DEFAULT_MAX_ACCURACY_M = 500

/**
 * Cleans a raw sequence of trackpoints before it is split into triplegs.
 *
 * Steps, applied in order (see docs/modernization-plan.md §2):
 * 1. Drop points with `acc > maxAccuracyM`.
 * 2. Drop exact duplicates: same time, or same lat/lon, as the last kept point.
 * 3. Minimum-displacement filter: drop a point whose distance to the last
 *    kept point is less than `max(lastKept.acc, point.acc)` metres — this
 *    removes GPS jitter while standing still (fixes legacy bug C7). A point
 *    whose mode differs from the last kept point's mode is never dropped by
 *    this step, so mode switches always survive.
 * 4. Speed-sanity filter: drop a point if the implied speed from the last
 *    kept point exceeds that point's mode's `maxSpeedKmh` ceiling.
 *
 * Points are processed in time order (stable sort by `t` first); the
 * returned array is also in time order.
 */
export function cleanTrackpoints(
  points: readonly Trackpoint[],
  opts: CleanOptions = {},
): Trackpoint[] {
  const maxAccuracyM = opts.maxAccuracyM ?? DEFAULT_MAX_ACCURACY_M
  const modes = opts.modes ?? MODES

  const sorted = [...points].sort((a, b) => a.t - b.t)

  // Step 1: accuracy filter.
  const accurate = sorted.filter((p) => p.acc <= maxAccuracyM)

  const kept: Trackpoint[] = []
  for (const p of accurate) {
    const last = kept[kept.length - 1]
    if (!last) {
      kept.push(p)
      continue
    }

    // Step 2: exact duplicates against the last kept point.
    if (p.t === last.t || (p.lat === last.lat && p.lon === last.lon)) {
      continue
    }

    const distKm = haversineKm(last, p)
    const distM = distKm * 1000

    // Step 3: minimum-displacement filter, unless this is a mode switch.
    if (p.mode === last.mode) {
      const threshold = Math.max(last.acc, p.acc)
      if (distM < threshold) {
        continue
      }
    }

    // Step 4: speed-sanity filter. `p.t > last.t` is guaranteed here because
    // the array is time-sorted and any equal-time point was dropped in step 2.
    const dtHours = (p.t - last.t) / 3_600_000
    const speedKmh = distKm / dtHours
    const maxSpeedKmh = modes[p.mode]?.maxSpeedKmh ?? Infinity
    if (speedKmh > maxSpeedKmh) {
      continue
    }

    kept.push(p)
  }

  return kept
}
