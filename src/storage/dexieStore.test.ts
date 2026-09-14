import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { parseLegacyCsv } from '../lib/legacyCsv'
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

  it('skips all legacy-CSV trips on a second import, because their ids are deterministic', async () => {
    // Minimal one-row, one-leg CSV fixture — little-endian WKB LineString,
    // no SRID, same format as the real 2022 export.
    const hex = (() => {
      const points: [number, number][] = [
        [2_683_000, 1_247_600],
        [2_683_200, 1_247_750],
      ]
      const buffer = new ArrayBuffer(1 + 4 + 4 + points.length * 16)
      const view = new DataView(buffer)
      let offset = 0
      view.setUint8(offset, 1)
      offset += 1
      view.setUint32(offset, 2, true) // LineString
      offset += 4
      view.setUint32(offset, points.length, true)
      offset += 4
      for (const [x, y] of points) {
        view.setFloat64(offset, x, true)
        offset += 8
        view.setFloat64(offset, y, true)
        offset += 8
      }
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    })()

    const csv = [
      'mode_type_id,tot_mj,tot_co2,trip_id,user_id,geometry,start_time,date,length,length',
      `4,0,0,1,1,${hex},14.12.22 08:05,14.12.22,250.00,0.250`,
    ].join('\n')

    const { trips } = parseLegacyCsv(csv, { userId: 1, profileName: 'Dario' })
    expect(trips).toHaveLength(1)

    const store = createDexieStore('tca-test-legacy-reimport')
    for (const t of trips) {
      await store.saveTrip(t)
    }
    expect(await store.listAllTrips()).toHaveLength(1)

    // Re-parsing and re-saving the same CSV produces the same deterministic
    // ids, so `saveTrip` (a Dexie `put`) overwrites rather than duplicates —
    // and importAll (used by the History page's importer) would skip them.
    const { trips: reparsed } = parseLegacyCsv(csv, { userId: 1, profileName: 'Dario' })
    const exportForReimport: TripExport = {
      format: 'trip-consumption-analysis/v1',
      exportedAt: new Date().toISOString(),
      profileName: 'Dario',
      trips: reparsed,
    }
    const result = await store.importAll(exportForReimport)
    expect(result).toEqual({ imported: 0, skipped: 1 })
    expect(await store.listAllTrips()).toHaveLength(1)
  })
})
