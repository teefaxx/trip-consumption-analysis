import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { ModeId, Trackpoint } from './types'

export interface TraceFeatureProperties {
  mode: ModeId
}

export type TraceFeatureCollection = FeatureCollection<LineString, TraceFeatureProperties>

/**
 * Builds a GeoJSON FeatureCollection for the live (or replayed) trace: one
 * LineString feature per consecutive run of same-mode points.
 *
 * A run of a single point cannot form a line and is skipped — no feature is
 * emitted for it, though its point still counts as "the previous run's last
 * point" for the run that follows. To keep the trace visually connected
 * across a mode switch, every run after the first has the previous run's
 * last point prepended as its own first coordinate.
 *
 * Pure and side-effect free: safe to call on every GPS fix and feed straight
 * into a Mapbox GeoJSON source's `data`.
 */
export function buildTraceFeatureCollection(points: readonly Trackpoint[]): TraceFeatureCollection {
  const features: Feature<LineString, TraceFeatureProperties>[] = []

  if (points.length === 0) {
    return { type: 'FeatureCollection', features }
  }

  const runs: Trackpoint[][] = []
  let current: Trackpoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    if (points[i].mode === points[i - 1].mode) {
      current.push(points[i])
    } else {
      runs.push(current)
      current = [points[i]]
    }
  }
  runs.push(current)

  let previousLast: Trackpoint | undefined
  for (const run of runs) {
    if (run.length < 2) {
      // Single-point run: can't form a line on its own, so no feature, but
      // it still anchors the connection point for whatever run comes next.
      previousLast = run[run.length - 1]
      continue
    }

    const coordinates: [number, number][] = run.map((p) => [p.lon, p.lat])
    if (previousLast) {
      coordinates.unshift([previousLast.lon, previousLast.lat])
    }

    features.push({
      type: 'Feature',
      properties: { mode: run[0].mode },
      geometry: { type: 'LineString', coordinates },
    })

    previousLast = run[run.length - 1]
  }

  return { type: 'FeatureCollection', features }
}
