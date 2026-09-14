import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { TripTooShortError } from '../lib'
import { tripStore as tripDB } from '../storage/dexieStore'
import { useTripStore } from './tripStore'

const CENTER = { lat: 47.4, lon: 8.5 }
// Matches @turf/helpers' earthRadius so a due-north offset here lines up
// exactly with what the engine's haversine distance computes (see
// src/lib/analyze.test.ts, which uses the same trick).
const METERS_PER_DEG_LAT = (6_371_008.8 * Math.PI) / 180

function fakePosition(t: number, distanceM: number, accuracy = 5): GeolocationPosition {
  const lat = CENTER.lat + distanceM / METERS_PER_DEG_LAT
  const coords: GeolocationCoordinates = {
    latitude: lat,
    longitude: CENTER.lon,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON() {
      return this
    },
  }
  return {
    coords,
    timestamp: t,
    toJSON() {
      return this
    },
  }
}

function resetStore() {
  useTripStore.setState({
    status: 'idle',
    mode: null,
    points: [],
    startedAt: null,
    lastPosition: null,
    error: null,
  })
}

describe('tripStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('records a trip across a mode switch, saves it, and clears the in-progress snapshot', async () => {
    const { startTrip, switchMode, addPosition, endTrip } = useTripStore.getState()

    const start = Date.UTC(2026, 5, 1, 12, 0, 0)
    startTrip(6)

    // 20 fixes, 100 m apart, 15 s cadence (24 km/h — under the 40 km/h
    // neutral-mode ceiling in clean.ts).
    let t = start
    for (let i = 0; i < 20; i++) {
      addPosition(fakePosition(t, i * 100))
      t += 15_000
    }

    switchMode(4)
    t += 60_000 // a gap before the tram leg starts

    // 20 more fixes continuing along the same line, 10 s cadence (36 km/h —
    // under the tram mode's 120 km/h ceiling).
    for (let i = 0; i < 20; i++) {
      addPosition(fakePosition(t, 2000 + i * 100))
      t += 10_000
    }

    expect(useTripStore.getState().points).toHaveLength(40)

    const trip = await endTrip()

    expect(trip.legs).toHaveLength(2)
    expect(trip.legs[0].mode).toBe(6)
    expect(trip.legs[1].mode).toBe(4)

    const state = useTripStore.getState()
    expect(state.status).toBe('idle')
    expect(state.points).toHaveLength(0)

    const saved = await tripDB.listAllTrips()
    expect(saved.map((t) => t.id)).toContain(trip.id)

    // The in-progress snapshot is only cleared on a successful end; verify
    // by restoring and confirming nothing comes back.
    const restored = await useTripStore.getState().restoreInProgress()
    expect(restored).toBe(false)
  })

  it('rejects with TripTooShortError on end and keeps the tracking state', async () => {
    const { startTrip, addPosition, endTrip } = useTripStore.getState()

    startTrip(6)
    addPosition(fakePosition(Date.UTC(2026, 5, 1, 12, 0, 0), 0))

    expect(useTripStore.getState().points).toHaveLength(1)

    await expect(endTrip()).rejects.toBeInstanceOf(TripTooShortError)

    const state = useTripStore.getState()
    expect(state.status).toBe('tracking')
    expect(state.points).toHaveLength(1)
  })

  it('restores an in-progress trip persisted before a reload', async () => {
    const { startTrip, addPosition } = useTripStore.getState()

    startTrip(6)
    const startedAt = useTripStore.getState().startedAt
    let t = Date.UTC(2026, 5, 1, 12, 0, 0)
    for (let i = 0; i < 5; i++) {
      addPosition(fakePosition(t, i * 100))
      t += 15_000
    }

    expect(useTripStore.getState().points).toHaveLength(5)

    // Simulate a reload: reset the in-memory state, then restore from
    // whatever was persisted to IndexedDB on each addPosition call.
    resetStore()
    expect(useTripStore.getState().status).toBe('idle')

    const restored = await useTripStore.getState().restoreInProgress()

    expect(restored).toBe(true)
    const state = useTripStore.getState()
    expect(state.status).toBe('tracking')
    expect(state.mode).toBe(6)
    expect(state.points).toHaveLength(5)
    expect(state.startedAt).toBe(startedAt)

    // Clean up so this trip doesn't leak into other tests via the shared
    // fake-indexeddb-backed default database.
    useTripStore.getState().discardTrip()
  })
})
