import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { Trip } from '../lib/types'
import { createDexieStore } from './dexieStore'
import type { TripExport } from './TripStore'

function trip(id: string, startT: number): Trip {
  return {
    id,
    profileName: 'tester',
    startT,
    endT: startT + 600_000,
    legs: [],
    totals: { distanceKm: 1, mj: 1, kgCo2: 1, travelMs: 600_000, byMode: {} },
  }
}

// Zurich noon on two different January (UTC+1) days.
const DAY_1 = Date.UTC(2026, 0, 10, 11, 0, 0)
const DAY_2 = Date.UTC(2026, 0, 11, 11, 0, 0)

describe('dexieStore', () => {
  it('lists only the trips saved on the requested (Zurich local) date', async () => {
    const store = createDexieStore('tca-test-list')
    await store.saveTrip(trip('trip-day1', DAY_1))
    await store.saveTrip(trip('trip-day2', DAY_2))

    const day1Trips = await store.listTripsOnDate('2026-01-10')
    expect(day1Trips.map((t) => t.id)).toEqual(['trip-day1'])

    const day2Trips = await store.listTripsOnDate('2026-01-11')
    expect(day2Trips.map((t) => t.id)).toEqual(['trip-day2'])

    const all = await store.listAllTrips()
    expect(all).toHaveLength(2)
  })

  it('round-trips through exportAll/importAll and skips duplicates on import', async () => {
    const source = createDexieStore('tca-test-export')
    await source.saveTrip(trip('trip-a', DAY_1))
    await source.saveTrip(trip('trip-b', DAY_2))

    const exported: TripExport = await source.exportAll()
    expect(exported.format).toBe('trip-consumption-analysis/v1')
    expect(exported.trips).toHaveLength(2)

    const destination = createDexieStore('tca-test-import')
    const firstImport = await destination.importAll(exported)
    expect(firstImport).toEqual({ imported: 2, skipped: 0 })
    expect(await destination.listAllTrips()).toHaveLength(2)

    // Importing the same export again should skip both as duplicates.
    const secondImport = await destination.importAll(exported)
    expect(secondImport).toEqual({ imported: 0, skipped: 2 })
    expect(await destination.listAllTrips()).toHaveLength(2)
  })

  it('deletes a trip', async () => {
    const store = createDexieStore('tca-test-delete')
    await store.saveTrip(trip('trip-x', DAY_1))
    expect(await store.getTrip('trip-x')).toBeDefined()

    await store.deleteTrip('trip-x')
    expect(await store.getTrip('trip-x')).toBeUndefined()
  })
})
