import { describe, expect, it } from 'vitest'
import { formatDuration, summarize } from './summary'
import type { Tripleg } from './types'

function leg(mode: 1 | 2, startT: number, endT: number, distanceKm: number): Tripleg {
  return {
    mode,
    startT,
    endT,
    points: [
      { t: startT, lat: 47, lon: 8, acc: 5, mode },
      { t: endT, lat: 47.01, lon: 8, acc: 5, mode },
    ],
    distanceKm,
    durationMs: endT - startT,
    rushHour: false,
    mj: distanceKm,
    kgCo2: distanceKm,
    geometry: { type: 'LineString', coordinates: [[8, 47], [8, 47.01]] },
  }
}

describe('summarize', () => {
  it('excludes the gap between legs from travelMs', () => {
    const HOUR = 3_600_000
    const legA = leg(1, 0, 10 * 60_000, 5) // 10 min
    const legB = leg(2, 10 * 60_000 + 6 * HOUR, 10 * 60_000 + 6 * HOUR + 20 * 60_000, 8) // starts 6h later, lasts 20 min

    const totals = summarize([legA, legB])

    expect(totals.travelMs).toBe(10 * 60_000 + 20 * 60_000)
    expect(totals.travelMs).toBeLessThan(legB.endT - legA.startT) // sanity: less than the naive last-end - first-start
    expect(totals.distanceKm).toBeCloseTo(13, 6)
    expect(totals.mj).toBeCloseTo(13, 6)
    expect(totals.kgCo2).toBeCloseTo(13, 6)
  })

  it('breaks totals down by mode', () => {
    const legA = leg(1, 0, 60_000, 1)
    const legB = leg(1, 60_000, 120_000, 2)
    const legC = leg(2, 120_000, 180_000, 4)

    const totals = summarize([legA, legB, legC])

    expect(totals.byMode[1]?.distanceKm).toBeCloseTo(3, 6)
    expect(totals.byMode[1]?.travelMs).toBe(120_000)
    expect(totals.byMode[2]?.distanceKm).toBeCloseTo(4, 6)
    expect(totals.byMode[2]?.travelMs).toBe(60_000)
  })
})

describe('formatDuration', () => {
  it('formats sub-hour durations as "min s"', () => {
    expect(formatDuration(12 * 60_000 + 30_000)).toBe('12 min 30 s')
  })

  it('formats hour-plus durations as "h min"', () => {
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min')
  })
})
