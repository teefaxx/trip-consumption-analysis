import Dexie, { type EntityTable } from 'dexie'
import { localDate } from '../lib/dates'
import type { Trip } from '../lib/types'
import type { TripExport, TripStore } from './TripStore'

/** A Trip as persisted: with a precomputed Zurich local date for the day index. */
interface StoredTrip extends Trip {
  date: string
}

class TripDatabase extends Dexie {
  trips!: EntityTable<StoredTrip, 'id'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      trips: 'id, startT, date',
    })
  }
}

function toStored(trip: Trip): StoredTrip {
  return { ...trip, date: localDate(trip.startT) }
}

/**
 * Creates a TripStore backed by Dexie/IndexedDB.
 * @param dbName Database name — override for test isolation (each call opens
 * its own database rather than sharing the default one).
 */
export function createDexieStore(dbName = 'trip-consumption-analysis'): TripStore {
  const db = new TripDatabase(dbName)
  return {
    async saveTrip(trip) {
      await db.trips.put(toStored(trip))
    },

    async getTrip(id) {
      return db.trips.get(id)
    },

    async listTripsOnDate(dateISO) {
      return db.trips.where('date').equals(dateISO).sortBy('startT')
    },

    async listAllTrips() {
      return db.trips.orderBy('startT').toArray()
    },

    async deleteTrip(id) {
      await db.trips.delete(id)
    },

    async exportAll() {
      const trips = await db.trips.orderBy('startT').toArray()
      return {
        format: 'trip-consumption-analysis/v1',
        exportedAt: new Date().toISOString(),
        profileName: trips[0]?.profileName ?? '',
        trips,
      }
    },

    async importAll(data) {
      let imported = 0
      let skipped = 0
      for (const trip of data.trips) {
        const existing = await db.trips.get(trip.id)
        if (existing) {
          skipped++
          continue
        }
        await db.trips.put(toStored(trip))
        imported++
      }
      return { imported, skipped }
    },
  }
}

export const tripStore = createDexieStore()

export type { TripExport, TripStore }
