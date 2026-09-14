import type { LatLon } from './distance'

/**
 * Converts Swiss LV95 (EPSG:2056) coordinates to WGS84 lat/lon using
 * swisstopo's approximate formulas ("Näherungsformeln"), accuracy ~1 m
 * within Switzerland. No proj4 dependency needed — see
 * docs/modernization-plan.md §1 ("Geo helpers").
 *
 * Source: swisstopo, "Approximate formulas for the transformation between
 * Swiss projection coordinates and WGS84".
 */
export function lv95ToWgs84(e: number, n: number): LatLon {
  const yPrime = (e - 2_600_000) / 1_000_000
  const xPrime = (n - 1_200_000) / 1_000_000

  const lambdaPrime =
    2.6779094 +
    4.728982 * yPrime +
    0.791484 * yPrime * xPrime +
    0.1306 * yPrime * xPrime * xPrime -
    0.0436 * yPrime * yPrime * yPrime

  const phiPrime =
    16.9023892 +
    3.238272 * xPrime -
    0.270978 * yPrime * yPrime -
    0.002528 * xPrime * xPrime -
    0.0447 * yPrime * yPrime * xPrime -
    0.014 * xPrime * xPrime * xPrime

  const lon = (lambdaPrime * 100) / 36
  const lat = (phiPrime * 100) / 36

  return { lat, lon }
}
