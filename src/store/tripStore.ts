import { create } from 'zustand'
import { analyzeTrip, type ModeId, type Trackpoint, type Trip } from '../lib'
import { clearInProgress, loadInProgress, saveInProgress, tripStore } from '../storage/dexieStore'
import { getProfileName, setProfileName as persistProfileName } from '../storage/profile'

export interface LastPosition {
  lat: number
  lon: number
  acc: number
  t: number
}

export interface TripState {
  profileName: string
  status: 'idle' | 'tracking'
  mode: ModeId | null
  /** Raw, uncleaned trackpoints recorded so far in the current trip. */
  points: Trackpoint[]
  startedAt: number | null
  lastPosition: LastPosition | null
  error: string | null

  setProfileName: (name: string) => void
  startTrip: (mode: ModeId) => void
  switchMode: (mode: ModeId) => void
  addPosition: (pos: GeolocationPosition) => void
  endTrip: () => Promise<Trip>
  discardTrip: () => void
  setError: (error: string | null) => void
  /** Restores an in-progress trip persisted before a reload/crash. Resolves
   * to whether a trip was restored (and, if so, `status` is 'tracking'). */
  restoreInProgress: () => Promise<boolean>
}

const IDLE_TRIP_FIELDS = {
  status: 'idle' as const,
  mode: null,
  points: [] as Trackpoint[],
  startedAt: null,
  lastPosition: null,
}

export const useTripStore = create<TripState>()((set, get) => ({
  profileName: getProfileName(),
  status: 'idle',
  mode: null,
  points: [],
  startedAt: null,
  lastPosition: null,
  error: null,

  setProfileName(name) {
    persistProfileName(name)
    set({ profileName: name })
  },

  startTrip(mode) {
    const startedAt = Date.now()
    set({ status: 'tracking', mode, points: [], startedAt, lastPosition: null, error: null })
    void saveInProgress({ mode, points: [], startedAt })
  },

  switchMode(mode) {
    if (get().status !== 'tracking') return
    set({ mode })
    const { points, startedAt } = get()
    void saveInProgress({ mode, points, startedAt })
  },

  addPosition(pos) {
    const { status, mode } = get()
    if (status !== 'tracking' || mode === null) return

    const point: Trackpoint = {
      t: pos.timestamp,
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      acc: pos.coords.accuracy,
      mode,
    }
    const points = [...get().points, point]
    set({
      points,
      lastPosition: { lat: point.lat, lon: point.lon, acc: point.acc, t: point.t },
    })
    void saveInProgress({ mode, points, startedAt: get().startedAt })
  },

  async endTrip() {
    const { points, profileName } = get()
    // Let TripTooShortError (or anything else) propagate: the trip stays
    // 'tracking' so the UI can offer to discard it instead of losing state.
    const trip = analyzeTrip(points, { profileName })
    await tripStore.saveTrip(trip)
    await clearInProgress()
    set({ ...IDLE_TRIP_FIELDS, error: null })
    return trip
  },

  discardTrip() {
    void clearInProgress()
    set({ ...IDLE_TRIP_FIELDS, error: null })
  },

  setError(error) {
    set({ error })
  },

  async restoreInProgress() {
    const saved = await loadInProgress()
    if (!saved || saved.mode === null || saved.points.length === 0) {
      return false
    }
    set({
      status: 'tracking',
      mode: saved.mode,
      points: saved.points,
      startedAt: saved.startedAt,
      lastPosition: null,
      error: null,
    })
    return true
  },
}))
