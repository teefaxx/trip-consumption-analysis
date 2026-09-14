import type { ModeId, Trackpoint } from './types'

export interface PointGroup {
  mode: ModeId
  points: Trackpoint[]
}

export interface SplitResult {
  legs: PointGroup[]
  dropped: PointGroup[]
}

/**
 * Groups a time-ordered sequence of cleaned trackpoints into consecutive
 * runs of the same mode. Every point belongs to exactly one group, and the
 * first point of a new run is the first point carrying the new mode — the
 * legacy `createTriplegs()` skipped that point and dropped the trip's last
 * two points (bug C3); this implementation does not.
 *
 * Runs with fewer than 2 points are returned separately as `dropped` rather
 * than as a leg, since a single point cannot form a line.
 */
export function splitTriplegs(points: readonly Trackpoint[]): SplitResult {
  const legs: PointGroup[] = []
  const dropped: PointGroup[] = []

  let current: PointGroup | undefined

  for (const p of points) {
    if (!current || current.mode !== p.mode) {
      current = { mode: p.mode, points: [] }
      legs.push(current)
    }
    current.points.push(p)
  }

  const kept: PointGroup[] = []
  for (const group of legs) {
    if (group.points.length < 2) {
      dropped.push(group)
    } else {
      kept.push(group)
    }
  }

  return { legs: kept, dropped }
}
