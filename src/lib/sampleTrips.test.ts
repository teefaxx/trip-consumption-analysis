import { describe, expect, it } from 'vitest'
import { localDate, addDaysIso } from './dates'
import { generateSampleTrips, isSampleTrip, prepareSampleTrips } from './sampleTrips'

describe('generateSampleTrips', () => {
  const now = Date.UTC(2026, 10, 4, 12)
  const trips = generateSampleTrips('Ada', now)

  it('produces analysed trips with stable sample ids', () => {
    expect(trips.map((t) => t.id)).toEqual(['sample-1', 'sample-2', 'sample-3', 'sample-4'])
    for (const t of trips) {
      expect(isSampleTrip(t)).toBe(true)
      expect(t.profileName).toBe('Ada')
      expect(t.legs.length).toBeGreaterThan(0)
      expect(t.totals.distanceKm).toBeGreaterThan(0.5)
    }
  })

  it('places them on the two days before today', () => {
    const today = localDate(now)
    const days = new Set(trips.map((t) => localDate(t.startT)))
    expect(days).toEqual(new Set([addDaysIso(today, -1), addDaysIso(today, -2)]))
  })

  it('keeps the multi-modal legs apart', () => {
    expect(trips[0].legs.map((l) => l.mode)).toEqual([6, 2, 4])
    expect(trips[2].legs.map((l) => l.mode)).toEqual([1, 3])
  })
})

describe('prepareSampleTrips', () => {
  it('moves stored samples so the latest lands on yesterday, keeping day gaps', () => {
    const stored = generateSampleTrips('seed', Date.UTC(2026, 0, 15, 12))
    const now = Date.UTC(2026, 10, 4, 12)
    const prepared = prepareSampleTrips(stored, 'Ada', now)
    const today = localDate(now)
    expect(new Set(prepared.map((t) => localDate(t.startT)))).toEqual(
      new Set([addDaysIso(today, -1), addDaysIso(today, -2)]),
    )
    expect(prepared.every((t) => t.profileName === 'Ada' && t.source === 'sample')).toBe(true)
    const shift = prepared[0].startT - stored[0].startT
    expect(prepared[0].legs[0].points[0].t - stored[0].legs[0].points[0].t).toBe(shift)
  })

  it('prefixes ids that are not sample ids yet', () => {
    const [one] = generateSampleTrips('seed')
    expect(prepareSampleTrips([{ ...one, id: 'commute' }], 'Ada')[0].id).toBe('sample-commute')
  })
})
