import { describe, expect, it } from 'vitest'
import { analyzeTrip } from './analyze'
import { TripTooShortError } from './errors'
import type { EmissionFactor } from './factors'
import type { ModeId, Trackpoint } from './types'

const CENTER = { lat: 47.4, lon: 8.5 }
// Matches @turf/helpers' earthRadius (6371008.8 m) so that a purely
// north-south offset here lines up exactly with what haversineKm computes
// (for a fixed longitude, the great-circle distance is exactly R * dLat).
const METERS_PER_DEG_LAT = (6_371_008.8 * Math.PI) / 180

/** A point `mDistance` metres due north of CENTER. */
function alongLine(mDistance: number) {
  return { lat: CENTER.lat + mDistance / METERS_PER_DEG_LAT, lon: CENTER.lon }
}

/**
 * Synthetic trip: walk 0.5 km (neutral) -> tram 3 km -> walk 0.3 km (neutral),
 * points ~100 m apart. The gaps between legs use a larger time step so the
 * mode-switch point never trips the speed-sanity filter in clean.ts, and
 * that idle time is deliberately excluded from every leg's own duration —
 * it's what the travelMs assertion below checks for.
 */
function buildRawPoints(startT: number): Trackpoint[] {
  const points: Trackpoint[] = []
  let t = startT

  const push = (m: number, mode: ModeId) => {
    const ll = alongLine(m)
    points.push({ t, lat: ll.lat, lon: ll.lon, acc: 5, mode })
  }

  // Leg 1: neutral, 0 -> 500 m, 15 s cadence (24 km/h, under the 40 km/h cap).
  for (let m = 0; m <= 500; m += 100) {
    if (m > 0) t += 15_000
    push(m, 6)
  }
  // Gap (60 s, 30 km/h) then leg 2: tram, 1000 -> 4000 m, 10 s cadence (36 km/h).
  for (let m = 1000; m <= 4000; m += 100) {
    t += m === 1000 ? 60_000 : 10_000
    push(m, 4)
  }
  // Gap (150 s, 24 km/h) then leg 3: neutral, 5000 -> 5300 m, 15 s cadence.
  for (let m = 5000; m <= 5300; m += 100) {
    t += m === 5000 ? 150_000 : 15_000
    push(m, 6)
  }

  return points
}

// Round, easy-to-check factor set. Neutral's normal/rush values are equal
// (as in the real mobitool table), so only the tram leg's numbers should
// change between the non-rush and rush-hour runs below.
const TEST_FACTORS: EmissionFactor[] = [
  {
    mode: 4,
    label: 'Tram',
    mjPerPkm: { normal: 2, rushHour: 5 },
    kgCo2PerPkm: { normal: 0.05, rushHour: 0.09 },
  },
  {
    mode: 6,
    label: 'CO₂-neutral',
    mjPerPkm: { normal: 1, rushHour: 1 },
    kgCo2PerPkm: { normal: 0.1, rushHour: 0.1 },
  },
]

// 2026-07-15, Europe/Zurich is UTC+2 (CEST) that day.
const NON_RUSH_START = Date.UTC(2026, 6, 15, 12, 0, 0) // 14:00 Zurich
const RUSH_START = Date.UTC(2026, 6, 15, 6, 0, 0) // 08:00 Zurich

describe('analyzeTrip (synthetic walk -> tram -> walk trip)', () => {
  it('produces three legs with exact distances and non-rush emissions', () => {
    const trip = analyzeTrip(buildRawPoints(NON_RUSH_START), {
      profileName: 'tester',
      factors: TEST_FACTORS,
    })

    expect(trip.legs).toHaveLength(3)
    expect(trip.legs.map((l) => l.mode)).toEqual([6, 4, 6])
    expect(trip.legs.every((l) => !l.rushHour)).toBe(true)

    expect(trip.legs[0].distanceKm).toBeCloseTo(0.5, 6)
    expect(trip.legs[1].distanceKm).toBeCloseTo(3.0, 6)
    expect(trip.legs[2].distanceKm).toBeCloseTo(0.3, 6)
    expect(trip.totals.distanceKm).toBeCloseTo(3.8, 6)

    expect(trip.legs[0].mj).toBeCloseTo(0.5, 6)
    expect(trip.legs[1].mj).toBeCloseTo(6.0, 6)
    expect(trip.legs[2].mj).toBeCloseTo(0.3, 6)
    expect(trip.totals.mj).toBeCloseTo(6.8, 6)

    expect(trip.legs[0].kgCo2).toBeCloseTo(0.05, 6)
    expect(trip.legs[1].kgCo2).toBeCloseTo(0.15, 6)
    expect(trip.legs[2].kgCo2).toBeCloseTo(0.03, 6)
    expect(trip.totals.kgCo2).toBeCloseTo(0.23, 6)

    // Sum of leg durations, excluding the idle time between legs.
    expect(trip.totals.travelMs).toBe(420_000)
  })

  it('uses the rush-hour factor for the tram leg only at 08:00 Zurich', () => {
    const trip = analyzeTrip(buildRawPoints(RUSH_START), {
      profileName: 'tester',
      factors: TEST_FACTORS,
    })

    expect(trip.legs).toHaveLength(3)
    expect(trip.legs[1].rushHour).toBe(true)

    // Neutral legs are numerically identical to the non-rush run because
    // their factor is the same in both regimes.
    expect(trip.legs[0].mj).toBeCloseTo(0.5, 6)
    expect(trip.legs[2].mj).toBeCloseTo(0.3, 6)
    expect(trip.legs[0].kgCo2).toBeCloseTo(0.05, 6)
    expect(trip.legs[2].kgCo2).toBeCloseTo(0.03, 6)

    // Tram leg picks up the rush-hour factor.
    expect(trip.legs[1].mj).toBeCloseTo(15.0, 6)
    expect(trip.legs[1].kgCo2).toBeCloseTo(0.27, 6)

    expect(trip.totals.mj).toBeCloseTo(15.8, 6)
    expect(trip.totals.kgCo2).toBeCloseTo(0.35, 6)
  })
})

describe('analyzeTrip error handling', () => {
  it('throws TripTooShortError when fewer than 2 usable points remain', () => {
    const onePoint: Trackpoint[] = [{ t: 0, lat: 47.4, lon: 8.5, acc: 5, mode: 6 }]
    expect(() => analyzeTrip(onePoint, { profileName: 'tester' })).toThrow(TripTooShortError)
    expect(() => analyzeTrip([], { profileName: 'tester' })).toThrow(TripTooShortError)
  })
})
