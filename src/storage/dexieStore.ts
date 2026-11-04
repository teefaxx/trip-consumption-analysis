import Dexie, { type EntityTable } from 'dexie'
import { localDate } from '../lib/dates'
import type { ModeId, Trackpoint, Trip } from '../lib/types'
import type { TripExport, TripStore } from './TripStore'

/** A Trip as persisted: with a precomputed Zurich local date for the day index. */
export interface StoredTrip extends Trip {
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

/**
 * A pending local change that still has to reach the cloud. Keyed by trip
 * id, so only the latest operation per trip is kept. `seq` lets the sync
 * engine tell whether an entry changed while it was being uploaded.
 */
export interface OutboxEntry {
  id: string
  op: 'upsert' | 'delete'
  seq: number
}

/** Small key/value table for sync bookkeeping (e.g. the pull watermark). */
export interface MetaEntry {
  key: string
  value: string
}

export class TripDatabase extends Dexie {
  trips!: EntityTable<StoredTrip, 'id'>
  inProgress!: EntityTable<StoredInProgress, 'id'>
  outbox!: EntityTable<OutboxEntry, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      trips: 'id, startT, date',
    })
    this.version(2).stores({
      trips: 'id, startT, date',
      inProgress: 'id',
    })
    this.version(3).stores({
      trips: 'id, startT, date',
      inProgress: 'id',
      outbox: 'id',
      meta: 'key',
    })
  }
}

export function toStored(trip: Trip): StoredTrip {
  return { ...trip, date: localDate(trip.startT) }
}

/** Strips the local-only `date` index field again. */
export function fromStored(stored: StoredTrip): Trip {
  const { date: _date, ...trip } = stored
  return trip
}

// Dexie instances are cheap to reuse and share the same underlying
// IndexedDB connection when opened with the same name; caching them here
// means the trip store, the sync engine and the in-progress helpers talk to
// the same open connection instead of each opening their own.
const databases = new Map<string, TripDatabase>()

export function getDatabase(dbName: string): TripDatabase {
  let db = databases.get(dbName)
  if (!db) {
    db = new TripDatabase(dbName)
    databases.set(dbName, db)
  }
  return db
}

/** Permanently removes a local database (used on sign-out / account deletion). */
export async function deleteDatabase(dbName: string): Promise<void> {
  const db = getDatabase(dbName)
  databases.delete(dbName)
  await db.delete()
}

export const DEFAULT_DB_NAME = 'trip-consumption-analysis'

let seqCounter = 0
/** Strictly increasing within this page, and unlikely to repeat across reloads. */
export function nextSeq(): number {
  seqCounter = Math.max(seqCounter + 1, Date.now() * 1000)
  return seqCounter
}

export interface DexieStoreOptions {
  /**
   * Record every save/delete in the outbox so the sync engine can upload
   * it. Only account databases do this; the signed-out (guest) database
   * never leaves the device.
   */
  trackChanges?: boolean
  /** Called after a tracked change has been written. */
  onChange?: () => void
}

/**
 * Creates a TripStore backed by Dexie/IndexedDB.
 * @param dbName Database name — override for test isolation (each name opens
 * its own database rather than sharing the default one).
 */
export function createDexieStore(
  dbName = DEFAULT_DB_NAME,
  { trackChanges = false, onChange }: DexieStoreOptions = {},
): TripStore {
  const db = getDatabase(dbName)

  const notify = () => {
    if (trackChanges) onChange?.()
  }

  return {
    async saveTrip(trip) {
      await db.transaction('rw', db.trips, db.outbox, async () => {
        await db.trips.put(toStored(trip))
        if (trackChanges) await db.outbox.put({ id: trip.id, op: 'upsert', seq: nextSeq() })
      })
      notify()
    },

    async getTrip(id) {
      const stored = await db.trips.get(id)
      return stored && fromStored(stored)
    },

    async listTripsOnDate(dateISO) {
      const rows = await db.trips.where('date').equals(dateISO).sortBy('startT')
      return rows.map(fromStored)
    },

    async listAllTrips() {
      const rows = await db.trips.orderBy('startT').toArray()
      return rows.map(fromStored)
    },

    async deleteTrip(id) {
      await db.transaction('rw', db.trips, db.outbox, async () => {
        await db.trips.delete(id)
        if (trackChanges) await db.outbox.put({ id, op: 'delete', seq: nextSeq() })
      })
      notify()
    },

    async exportAll() {
      const trips = (await db.trips.orderBy('startT').toArray()).map(fromStored)
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
      await db.transaction('rw', db.trips, db.outbox, async () => {
        for (const trip of data.trips) {
          const existing = await db.trips.get(trip.id)
          if (existing) {
            skipped++
            continue
          }
          await db.trips.put(toStored(trip))
          if (trackChanges) await db.outbox.put({ id: trip.id, op: 'upsert', seq: nextSeq() })
          imported++
        }
      })
      if (imported > 0) notify()
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

// ---------------------------------------------------------------------------
// The app-wide store. It points at the guest database while signed out and
// at a per-account database while signed in, so two accounts on the same
// device never see each other's trips.
// ---------------------------------------------------------------------------

let active: TripStore = createDexieStore(DEFAULT_DB_NAME)
let activeName = DEFAULT_DB_NAME

/** Local database name for an account. */
export function accountDbName(userId: string): string {
  return `${DEFAULT_DB_NAME}-account-${userId}`
}

/** Switches the app-wide `tripStore` to an account database, or back to the guest one (`null`). */
export function setActiveAccount(userId: string | null, onChange?: () => void): void {
  activeName = userId ? accountDbName(userId) : DEFAULT_DB_NAME
  active = userId
    ? createDexieStore(activeName, { trackChanges: true, onChange })
    : createDexieStore(DEFAULT_DB_NAME)
}

export function activeDbName(): string {
  return activeName
}

export const tripStore: TripStore = {
  saveTrip: (trip) => active.saveTrip(trip),
  getTrip: (id) => active.getTrip(id),
  listTripsOnDate: (dateISO) => active.listTripsOnDate(dateISO),
  listAllTrips: () => active.listAllTrips(),
  deleteTrip: (id) => active.deleteTrip(id),
  exportAll: () => active.exportAll(),
  importAll: (data) => active.importAll(data),
}

export type { TripExport, TripStore }
