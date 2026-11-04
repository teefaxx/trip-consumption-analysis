import { create } from 'zustand'
import { localDate, type Trip } from '../lib'
import { prepareSampleTrips } from '../lib/sampleTrips'
import { fetchSampleTrips, supabase } from '../lib/supabase'

/**
 * The shared, read-only sample trips from Supabase (`sample_trips`), shown
 * to everyone, signed in or not. They are never stored in anyone's trips,
 * so nobody can delete them from the app; only the project owner can edit
 * them (Supabase → Table Editor). Cached in localStorage for offline use.
 */
export interface SampleState {
  samples: Trip[]
  /** Per-device preference, default on. */
  showSamples: boolean
  load: () => Promise<void>
  setShowSamples: (show: boolean) => void
  /** Samples on a Zurich-local date, or [] when hidden. */
  samplesOn: (dateISO: string) => Trip[]
}

const CACHE_KEY = 'tca.sampleTrips'
const SHOW_KEY = 'tca.showSampleTrips'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable — fine, samples just reload next time.
  }
}

function cachedSamples(): Trip[] {
  try {
    const raw = read(CACHE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Trip[]) : []
  } catch {
    return []
  }
}

export const useSampleStore = create<SampleState>()((set, get) => ({
  samples: prepareSampleTrips(cachedSamples(), ''),
  showSamples: read(SHOW_KEY) !== '0',

  async load() {
    if (!supabase) return
    const stored = await fetchSampleTrips(supabase)
    if (stored.length === 0) return // offline or table missing: keep the cache
    write(CACHE_KEY, JSON.stringify(stored))
    set({ samples: prepareSampleTrips(stored, '') })
  },

  setShowSamples(show) {
    write(SHOW_KEY, show ? '1' : '0')
    set({ showSamples: show })
  },

  samplesOn(dateISO) {
    const { samples, showSamples } = get()
    if (!showSamples) return []
    return samples.filter((t) => localDate(t.startT) === dateISO)
  },
}))
