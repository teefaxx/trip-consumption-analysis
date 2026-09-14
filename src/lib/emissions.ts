import type { LineString } from 'geojson'
import { pathLengthKm } from './distance'
import { FACTORS, getFactor, type EmissionFactor } from './factors'
import { isRushHour } from './rushHour'
import type { PointGroup } from './triplegs'
import type { ModeId, Tripleg } from './types'

/**
 * Energy (MJ) and CO2 (kg) for a leg of the given mode, distance and
 * rush-hour flag. The one place the factor table is looked up and
 * multiplied by distance — shared by `buildTripleg` (recorded trips) and
 * `parseLegacyCsv` (2022 import) so the two paths can never diverge.
 */
export function computeLegEmissions(
  mode: ModeId,
  distanceKm: number,
  rushHour: boolean,
  factors: readonly EmissionFactor[] = FACTORS,
): { mj: number; kgCo2: number } {
  const factor = getFactor(mode, factors)
  const mj = distanceKm * (rushHour ? factor.mjPerPkm.rushHour : factor.mjPerPkm.normal)
  const kgCo2 =
    distanceKm * (rushHour ? factor.kgCo2PerPkm.rushHour : factor.kgCo2PerPkm.normal)
  return { mj, kgCo2 }
}

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

  const { mj, kgCo2 } = computeLegEmissions(mode, distanceKm, rushHour, factors)

  const geometry: LineString = {
    type: 'LineString',
    coordinates: points.map((p) => [p.lon, p.lat]),
  }

  return { mode, startT, endT, points, distanceKm, durationMs, rushHour, mj, kgCo2, geometry }
}
