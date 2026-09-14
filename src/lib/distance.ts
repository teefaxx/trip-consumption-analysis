import { distance } from '@turf/distance'
import { point } from '@turf/helpers'

export interface LatLon {
  lat: number
  lon: number
}

/** Great-circle distance between two WGS84 points, in kilometres. */
export function haversineKm(a: LatLon, b: LatLon): number {
  return distance(point([a.lon, a.lat]), point([b.lon, b.lat]), { units: 'kilometers' })
}

/** Sum of consecutive haversine distances along an ordered list of points. */
export function pathLengthKm(points: readonly LatLon[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i])
  }
  return total
}
