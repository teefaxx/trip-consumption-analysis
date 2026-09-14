import { describe, expect, it } from 'vitest'
import { haversineKm, pathLengthKm } from './distance'

const ZURICH_HB = { lat: 47.3779, lon: 8.5403 }
const BERN = { lat: 46.949, lon: 7.439 }

describe('haversineKm', () => {
  it('Zurich HB to Bern is roughly 95 km', () => {
    const km = haversineKm(ZURICH_HB, BERN)
    expect(km).toBeGreaterThan(93)
    expect(km).toBeLessThan(97)
  })

  it('distance from a point to itself is 0', () => {
    expect(haversineKm(ZURICH_HB, ZURICH_HB)).toBe(0)
  })
})

describe('pathLengthKm', () => {
  it('sums consecutive distances', () => {
    const a = { lat: 47.0, lon: 8.0 }
    const b = { lat: 47.01, lon: 8.0 }
    const c = { lat: 47.02, lon: 8.0 }
    const total = pathLengthKm([a, b, c])
    expect(total).toBeCloseTo(haversineKm(a, b) + haversineKm(b, c), 10)
  })

  it('is 0 for fewer than 2 points', () => {
    expect(pathLengthKm([])).toBe(0)
    expect(pathLengthKm([ZURICH_HB])).toBe(0)
  })
})
