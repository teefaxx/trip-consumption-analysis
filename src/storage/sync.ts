import type { Trip } from '../lib/types'
import { getDatabase, toStored, type OutboxEntry } from './dexieStore'

/** One row of the `trips` table as the server returns it. */
export interface RemoteTripRow {
  id: string
  data: Trip | null
  deleted: boolean
  updated_at: string
}

/** One row as the client writes it. */
export interface RemoteTripWrite {
  id: string
  data: Trip | null
  deleted: boolean
  start_t: number | null
}

/** The server side of sync — Supabase in the app, an in-memory fake in tests. */
export interface TripRemote {
  upsert(rows: RemoteTripWrite[]): Promise<void>
  /** Rows with `updated_at >= since` (all rows when `since` is null), oldest first. */
  fetchSince(since: string | null): Promise<RemoteTripRow[]>
}

export interface SyncResult {
  pushed: number
  pulled: number
  /** Local changes that could not be uploaded (e.g. over quota). */
  failed: number
  failedMessage: string | null
}

const PUSH_CHUNK = 10
const WATERMARK_KEY = 'lastPulledAt'
/**
 * The pull asks for rows changed since the last watermark minus this
 * margin, so a row committed slightly out of timestamp order is still
 * picked up. Re-applying a row is harmless.
 */
const PULL_OVERLAP_MS = 60_000

function isTrip(value: unknown, id: string): value is Trip {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<Trip>
  return (
    t.id === id &&
    typeof t.startT === 'number' &&
    typeof t.endT === 'number' &&
    Array.isArray(t.legs) &&
    typeof t.totals === 'object' &&
    t.totals !== null
  )
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String(err.message)
  return 'Unknown error'
}

/**
 * Two-way sync of one local account database with the server:
 * 1. push the outbox (local saves/deletes), then
 * 2. pull everything changed on the server since the last pull.
 *
 * Trips never change after they are saved, so there are no real conflicts:
 * a trip either exists or has been deleted. A pending local change always
 * wins over the server copy until it has been pushed.
 */
export async function syncDatabase(
  dbName: string,
  remote: TripRemote,
): Promise<SyncResult> {
  const db = getDatabase(dbName)

  // 1. Push.
  const entries = await db.outbox.toArray()
  const writes: { entry: OutboxEntry; row: RemoteTripWrite }[] = []
  for (const entry of entries) {
    const stored = entry.op === 'upsert' ? await db.trips.get(entry.id) : undefined
    if (entry.op === 'upsert' && stored) {
      const { date: _date, ...trip } = stored
      writes.push({
        entry,
        row: { id: entry.id, data: trip, deleted: false, start_t: trip.startT },
      })
    } else {
      // Deleted, or an upsert whose trip has since vanished locally.
      writes.push({ entry, row: { id: entry.id, data: null, deleted: true, start_t: null } })
    }
  }

  const done: OutboxEntry[] = []
  let failed = 0
  let failedMessage: string | null = null
  for (let i = 0; i < writes.length; i += PUSH_CHUNK) {
    const chunk = writes.slice(i, i + PUSH_CHUNK)
    try {
      await remote.upsert(chunk.map((w) => w.row))
      done.push(...chunk.map((w) => w.entry))
    } catch (chunkErr) {
      // Retry one by one so a single bad row (e.g. over quota) cannot
      // block everything queued behind it.
      for (const w of chunk) {
        try {
          if (chunk.length === 1) throw chunkErr
          await remote.upsert([w.row])
          done.push(w.entry)
        } catch (err) {
          failed++
          failedMessage = errorMessage(err)
        }
      }
    }
  }

  // Nothing got through: most likely offline. Leave the outbox alone.
  if (writes.length > 0 && done.length === 0) {
    throw new Error(failedMessage ?? 'Sync failed.')
  }

  await db.transaction('rw', db.outbox, async () => {
    for (const entry of done) {
      const current = await db.outbox.get(entry.id)
      // Only clear it if nothing newer was queued during the upload.
      if (current && current.seq === entry.seq) await db.outbox.delete(entry.id)
    }
  })

  // 2. Pull.
  const watermark = (await db.meta.get(WATERMARK_KEY))?.value ?? null
  const since = watermark
    ? new Date(new Date(watermark).getTime() - PULL_OVERLAP_MS).toISOString()
    : null
  const rows = await remote.fetchSince(since)

  let pulled = 0
  let maxUpdated = watermark
  await db.transaction('rw', db.trips, db.outbox, db.meta, async () => {
    for (const row of rows) {
      if (!maxUpdated || row.updated_at > maxUpdated) maxUpdated = row.updated_at
      if (await db.outbox.get(row.id)) continue // local change pending — it wins
      if (row.deleted) {
        if (await db.trips.get(row.id)) {
          await db.trips.delete(row.id)
          pulled++
        }
      } else if (isTrip(row.data, row.id)) {
        const existing = await db.trips.get(row.id)
        if (!existing) pulled++
        await db.trips.put(toStored(row.data))
      }
    }
    if (maxUpdated) await db.meta.put({ key: WATERMARK_KEY, value: maxUpdated })
  })

  return { pushed: done.length, pulled, failed, failedMessage }
}

/** Number of local changes still waiting to be uploaded. */
export async function pendingCount(dbName: string): Promise<number> {
  return getDatabase(dbName).outbox.count()
}
