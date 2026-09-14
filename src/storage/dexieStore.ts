import Dexie, { type EntityTable } from 'dexie'
import { localDate } from '../lib/dates'
import type { ModeId, Trackpoint, Trip } from '../lib/types'
import type { TripExport, TripStore } from './TripStore'

/** A Trip as persisted: with a precomputed Zurich local date for the day index. */
interface StoredTrip extends Trip {
  date: string
}

/**
 * Snapshot of a trip that is currently being recorded, persisted so that a
 * reload or crash mid-trip does not lose it (fixes legacy bug F1).
 */
export interface InProgressTrip {
  mode: ModeId | null
  points: Trackpoint[]
  startedAt: number | null
}

/** Always stored under this single key — there is only ever one in-progress trip. */
const IN_PROGRESS_KEY = 'current'

interface StoredInProgress extends InProgressTrip {
  id: typeof IN_PROGRESS_KEY
}

class TripDatabase extends Dexie {
  trips!: EntityTable<StoredTrip, 'id'>
  inProgress!: EntityTable<StoredInProgress, 'id'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      trips: 'id, startT, date',
    })
    this.version(2).stores({
      trips: 'id, startT, date',
      inProgress: 'id',
    })
  }
}

function toStored(trip: Trip): StoredTrip {
  return { ...trip, date: localDate(trip.startT) }
}

// Dexie instances are cheap to reuse and share the same underlying
// IndexedDB connection when opened with the same name; caching them here
// means `tripStore` (below) and the `saveInProgress`/`loadInProgress`/
// `clearInProgress` helpers talk to the same open connection instead of
// each opening their own.
const databases = new Map<string, TripDatabase>()

function getDatabase(dbName: string): TripDatabase {
  let db = databases.get(dbName)
  if (!db) {
    db = new TripDatabase(dbName)
    databases.set(dbName, db)
  }
  return db
}

const DEFAULT_DB_NAME = 'trip-consumption-analysis'

/**
 * Creates a TripStore backed by Dexie/IndexedDB.
 * @param dbName Database name — override for test isolation (each name opens
 * its own database rather than sharing the default one).
 */
export function createDexieStore(dbName = DEFAULT_DB_NAME): TripStore {
  const db = getDatabase(dbName)
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

/** Persists the current in-progress trip snapshot, overwriting the previous one. */
export async function saveInProgress(
  data: InProgressTrip,
  dbName = DEFAULT_DB_NAME,
): Promise<void> {
  const db = getDatabase(dbName)
  await db.inProgress.put({ id: IN_PROGRESS_KEY, ...data })
}

/** Loads the persisted in-progress trip snapshot, if any. */
export async function loadInProgress(
  dbName = DEFAULT_DB_NAME,
): Promise<InProgressTrip | undefined> {
  const db = getDatabase(dbName)
  const row = await db.inProgress.get(IN_PROGRESS_KEY)
  if (!row) return undefined
  const { mode, points, startedAt } = row
  return { mode, points, startedAt }
}

/** Clears the persisted in-progress trip snapshot (trip ended or discarded). */
export async function clearInProgress(dbName = DEFAULT_DB_NAME): Promise<void> {
  const db = getDatabase(dbName)
  await db.inProgress.delete(IN_PROGRESS_KEY)
}

export const tripStore = createDexieStore()

export type { TripExport, TripStore }
