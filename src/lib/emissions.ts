import type { LineString } from 'geojson'
import { pathLengthKm } from './distance'
import { FACTORS, getFactor, type EmissionFactor } from './factors'
import { isRushHour } from './rushHour'
import type { PointGroup } from './triplegs'
import type { Tripleg } from './types'

/**
 * Builds a Tripleg from a grouped run of same-mode trackpoints: distance,
 * duration, rush-hour flag (evaluated at the leg's start time, per the
 * modernization plan), energy and CO2, and a GeoJSON LineString geometry.
 *
 * No rounding is applied anywhere in the engine — round only for display.
 */
export function buildTripleg(
  group: PointGroup,
  factors: readonly EmissionFactor[] = FACTORS,
  tz = 'Europe/Zurich',
): Tripleg {
  const { mode, points } = group
  const startT = points[0].t
  const endT = points[points.length - 1].t

  const distanceKm = pathLengthKm(points)
  const durationMs = endT - startT
  const rushHour = isRushHour(startT, tz)

  const factor = getFactor(mode, factors)
  const mj = distanceKm * (rushHour ? factor.mjPerPkm.rushHour : factor.mjPerPkm.normal)
  const kgCo2 =
    distanceKm * (rushHour ? factor.kgCo2PerPkm.rushHour : factor.kgCo2PerPkm.normal)

  const geometry: LineString = {
    type: 'LineString',
    coordinates: points.map((p) => [p.lon, p.lat]),
  }

  return { mode, startT, endT, points, distanceKm, durationMs, rushHour, mj, kgCo2, geometry }
}
