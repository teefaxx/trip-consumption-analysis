import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { Trip } from '../lib/types'
import { createDexieStore } from './dexieStore'
import { pendingCount, syncDatabase, type RemoteTripRow, type TripRemote } from './sync'

function trip(id: string, startT = Date.UTC(2026, 0, 10, 11)): Trip {
  return {
    id,
    profileName: 'tester',
    startT,
    endT: startT + 600_000,
    legs: [],
    totals: { distanceKm: 1, mj: 1, kgCo2: 1, travelMs: 600_000, byMode: {} },
  }
}

/** In-memory stand-in for the Supabase `trips` table of one user. */
function fakeRemote() {
  const rows = new Map<string, RemoteTripRow>()
  let clock = Date.UTC(2026, 0, 1)
  let failIds = new Set<string>()
  let offline = false
  const remote: TripRemote = {
    async upsert(writes) {
      if (offline) throw new Error('Failed to fetch')
      if (writes.some((w) => failIds.has(w.id))) throw new Error('Storage limit reached')
      for (const w of writes) {
        clock += 1000
        rows.set(w.id, {
          id: w.id,
          data: w.data,
          deleted: w.deleted,
          updated_at: new Date(clock).toISOString(),
        })
      }
    },
    async fetchSince(since) {
      if (offline) throw new Error('Failed to fetch')
      return [...rows.values()]
        .filter((r) => !since || r.updated_at >= since)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    },
  }
  return {
    remote,
    rows,
    setOffline: (v: boolean) => (offline = v),
    setFailIds: (ids: string[]) => (failIds = new Set(ids)),
  }
}

let dbCounter = 0
const freshDb = () => `tca-sync-test-${++dbCounter}`

describe('syncDatabase', () => {
  it('pushes local saves and deletes, then clears the outbox', async () => {
    const name = freshDb()
    const store = createDexieStore(name, { trackChanges: true })
    const { remote, rows } = fakeRemote()

    await store.saveTrip(trip('a'))
    await store.saveTrip(trip('b'))
    expect(await pendingCount(name)).toBe(2)

    const first = await syncDatabase(name, remote)
    expect(first.pushed).toBe(2)
    expect(await pendingCount(name)).toBe(0)
    expect(rows.get('a')?.data?.id).toBe('a')

    await store.deleteTrip('a')
    await syncDatabase(name, remote)
    expect(rows.get('a')).toMatchObject({ deleted: true, data: null })
  })

  it('pulls trips and deletions made on another device', async () => {
    const { remote } = fakeRemote()
    const phone = freshDb()
    const laptop = freshDb()
    const phoneStore = createDexieStore(phone, { trackChanges: true })
    const laptopStore = createDexieStore(laptop, { trackChanges: true })

    await phoneStore.saveTrip(trip('x'))
    await syncDatabase(phone, remote)

    const pulled = await syncDatabase(laptop, remote)
    expect(pulled.pulled).toBe(1)
    expect(await laptopStore.getTrip('x')).toMatchObject({ id: 'x' })

    await laptopStore.deleteTrip('x')
    await syncDatabase(laptop, remote)
    await syncDatabase(phone, remote)
    expect(await phoneStore.getTrip('x')).toBeUndefined()
  })

  it('does not let a server copy overwrite a pending local delete', async () => {
    const { remote } = fakeRemote()
    const a = freshDb()
    const storeA = createDexieStore(a, { trackChanges: true })
    await storeA.saveTrip(trip('y'))
    await syncDatabase(a, remote)

    const b = freshDb()
    const storeB = createDexieStore(b, { trackChanges: true })
    await syncDatabase(b, remote)
    await storeB.deleteTrip('y')
    await syncDatabase(b, remote)
    expect(await storeB.getTrip('y')).toBeUndefined()
  })

  it('keeps the outbox when offline', async () => {
    const name = freshDb()
    const store = createDexieStore(name, { trackChanges: true })
    const { remote, setOffline } = fakeRemote()
    await store.saveTrip(trip('z'))
    setOffline(true)
    await expect(syncDatabase(name, remote)).rejects.toThrow('Failed to fetch')
    expect(await pendingCount(name)).toBe(1)
    setOffline(false)
    await syncDatabase(name, remote)
    expect(await pendingCount(name)).toBe(0)
  })

  it('uploads the rest when one trip is rejected', async () => {
    const name = freshDb()
    const store = createDexieStore(name, { trackChanges: true })
    const { remote, rows, setFailIds } = fakeRemote()
    await store.saveTrip(trip('ok-1'))
    await store.saveTrip(trip('too-big'))
    await store.saveTrip(trip('ok-2'))
    setFailIds(['too-big'])
    const result = await syncDatabase(name, remote)
    expect(result).toMatchObject({ pushed: 2, failed: 1, failedMessage: 'Storage limit reached' })
    expect([...rows.keys()].sort()).toEqual(['ok-1', 'ok-2'])
    expect(await pendingCount(name)).toBe(1)
  })

  it('ignores malformed server rows', async () => {
    const { remote, rows } = fakeRemote()
    rows.set('bad', {
      id: 'bad',
      data: { nope: true } as unknown as Trip,
      deleted: false,
      updated_at: new Date().toISOString(),
    })
    const name = freshDb()
    await syncDatabase(name, remote)
    expect(await createDexieStore(name).listAllTrips()).toEqual([])
  })

  it('never tracks changes in an untracked (guest) store', async () => {
    const name = freshDb()
    const store = createDexieStore(name)
    await store.saveTrip(trip('guest'))
    expect(await pendingCount(name)).toBe(0)
  })
})
