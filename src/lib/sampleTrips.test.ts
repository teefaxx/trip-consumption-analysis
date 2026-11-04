import { describe, expect, it } from 'vitest'
import { localDate, addDaysIso } from './dates'
import { generateSampleTrips, isSampleTrip } from './sampleTrips'

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
