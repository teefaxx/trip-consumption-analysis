import type { User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { createSupabaseRemote, fetchSampleTrips, supabase } from '../lib/supabase'
import { isSampleTrip, prepareSampleTrips } from '../lib/sampleTrips'
import {
  accountDbName,
  createDexieStore,
  DEFAULT_DB_NAME,
  deleteDatabase,
  setActiveAccount,
  tripStore,
} from '../storage/dexieStore'
import { pendingCount, syncDatabase } from '../storage/sync'
import { useTripStore } from './tripStore'

export interface Account {
  id: string
  /** Display name: the GitHub name, falling back to the GitHub login. */
  name: string
  login: string | null
}

export interface AccountState {
  /** False when this build has no Supabase project configured. */
  configured: boolean
  /** True once the stored session (if any) has been restored. */
  ready: boolean
  account: Account | null
  syncing: boolean
  lastSyncedAt: number | null
  syncError: string | null
  pending: number
  /**
   * Bumped whenever the visible trip data changes underneath the UI
   * (account switched, sync pulled something) so pages reload.
   */
  dataVersion: number
  /** Trips recorded on this device while signed out, offered once after sign-in. */
  deviceTripsOffer: number | null
  authError: string | null

  init: () => Promise<void>
  signIn: () => Promise<void>
  /** Uploads pending changes, then signs out and removes this account's local copy. */
  signOut: (opts?: { force?: boolean }) => Promise<{ ok: boolean; pending: number }>
  deleteAccount: () => Promise<void>
  syncNow: () => Promise<void>
  addDeviceTrips: () => Promise<number>
  dismissDeviceTrips: () => void
  /** Copies the shared sample trips into the account; resolves to how many. */
  addSampleTrips: () => Promise<number>
  removeSampleTrips: () => Promise<number>
  countDeviceTrips: () => Promise<number>
}

const OFFER_KEY_PREFIX = 'tca.deviceTripsOffered.'

function offerKey(userId: string): string {
  return `${OFFER_KEY_PREFIX}${userId}`
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // localStorage unavailable — the offer may simply show again.
  }
}

function toAccount(user: User): Account {
  const meta = user.user_metadata ?? {}
  const login = typeof meta.user_name === 'string' ? meta.user_name : null
  const fullName =
    typeof meta.full_name === 'string' && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === 'string' && meta.name.trim()
        ? meta.name.trim()
        : null
  return { id: user.id, name: fullName ?? login ?? 'GitHub user', login }
}

/** Strips OAuth leftovers (?code=, ?error=) from the address bar after sign-in. */
function cleanAuthParams(): string | null {
  const url = new URL(window.location.href)
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  let changed = false
  for (const p of ['code', 'error', 'error_code', 'error_description', 'state']) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p)
      changed = true
    }
  }
  if (changed) window.history.replaceState(window.history.state, '', url.toString())
  return error
}

async function loadSampleTrips(profileName: string) {
  if (!supabase) return []
  return prepareSampleTrips(await fetchSampleTrips(supabase), profileName)
}

const SYNC_DEBOUNCE_MS = 1500
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncAgain = false
let initialized = false

export const useAccountStore = create<AccountState>()((set, get) => {
  const bump = () => set((s) => ({ dataVersion: s.dataVersion + 1 }))

  const scheduleSync = () => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => void get().syncNow(), SYNC_DEBOUNCE_MS)
  }

  const refreshPending = async () => {
    const { account } = get()
    if (account) set({ pending: await pendingCount(accountDbName(account.id)) })
  }

  const activate = async (user: User | null) => {
    const current = get().account
    const next = user ? toAccount(user) : null
    if (current?.id === next?.id) {
      if (next) set({ account: next })
      return
    }
    setActiveAccount(next?.id ?? null, () => {
      void refreshPending()
      scheduleSync()
    })
    useTripStore.setState({ profileName: next?.name ?? '' })
    set({
      account: next,
      syncError: null,
      lastSyncedAt: null,
      pending: 0,
      deviceTripsOffer: null,
    })
    bump()
    if (!next) return

    await refreshPending()
    await get().syncNow()
    if (!readFlag(offerKey(next.id))) {
      const count = await get().countDeviceTrips()
      if (count > 0 && get().account?.id === next.id) set({ deviceTripsOffer: count })
      else writeFlag(offerKey(next.id), true)
    }
  }

  return {
    configured: supabase !== null,
    ready: supabase === null,
    account: null,
    syncing: false,
    lastSyncedAt: null,
    syncError: null,
    pending: 0,
    dataVersion: 0,
    deviceTripsOffer: null,
    authError: null,

    async init() {
      if (!supabase || initialized) return
      initialized = true

      supabase.auth.onAuthStateChange((event, session) => {
        // Defer: supabase-js must not be awaited inside this callback.
        setTimeout(() => {
          if (event === 'SIGNED_OUT') void activate(null)
          else if (session?.user) void activate(session.user)
        }, 0)
      })

      const { data, error } = await supabase.auth.getSession()
      const urlError = cleanAuthParams()
      set({
        ready: true,
        authError: urlError ?? (error ? error.message : null),
      })
      if (data.session?.user) await activate(data.session.user)

      window.addEventListener('online', () => {
        if (get().account) void get().syncNow()
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && get().account) scheduleSync()
      })
    },

    async signIn() {
      if (!supabase) return
      set({ authError: null })
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo },
      })
      if (error) set({ authError: error.message })
    },

    async syncNow() {
      const { account } = get()
      if (!supabase || !account) return
      if (get().syncing) {
        syncAgain = true
        return
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        set({ syncError: 'Offline — changes will upload when you are back online.' })
        await refreshPending()
        return
      }
      set({ syncing: true })
      try {
        const result = await syncDatabase(
          accountDbName(account.id),
          createSupabaseRemote(supabase, account.id),
          { seed: () => loadSampleTrips(account.name) },
        )
        if (get().account?.id !== account.id) return
        set({
          lastSyncedAt: Date.now(),
          syncError: result.failed
            ? `${result.failed} trip${result.failed === 1 ? '' : 's'} could not be uploaded: ${result.failedMessage}`
            : null,
        })
        if (result.pulled > 0 || result.pushed > 0) bump()
      } catch (err) {
        set({ syncError: err instanceof Error ? err.message : 'Sync failed.' })
      } finally {
        set({ syncing: false })
        await refreshPending()
        if (syncAgain) {
          syncAgain = false
          scheduleSync()
        }
      }
    },

    async signOut({ force = false } = {}) {
      const { account } = get()
      if (!supabase || !account) return { ok: true, pending: 0 }
      await get().syncNow()
      const pending = await pendingCount(accountDbName(account.id))
      if (pending > 0 && !force) return { ok: false, pending }

      await supabase.auth.signOut({ scope: 'local' })
      await activate(null)
      // Don't leave this account's trips behind on a shared device.
      await deleteDatabase(accountDbName(account.id))
      return { ok: true, pending: 0 }
    },

    async deleteAccount() {
      const { account } = get()
      if (!supabase || !account) return
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw new Error(error.message)
      await supabase.auth.signOut({ scope: 'local' })
      await activate(null)
      await deleteDatabase(accountDbName(account.id))
      writeFlag(offerKey(account.id), false)
    },

    async countDeviceTrips() {
      const guest = createDexieStore(DEFAULT_DB_NAME)
      const trips = await guest.listAllTrips()
      return trips.filter((t) => !isSampleTrip(t)).length
    },

    async addDeviceTrips() {
      const { account } = get()
      if (!account) return 0
      const guest = createDexieStore(DEFAULT_DB_NAME)
      const trips = (await guest.listAllTrips()).filter((t) => !isSampleTrip(t))
      const result = await tripStore.importAll({
        format: 'trip-consumption-analysis/v1',
        exportedAt: new Date().toISOString(),
        profileName: account.name,
        trips,
      })
      writeFlag(offerKey(account.id), true)
      set({ deviceTripsOffer: null })
      bump()
      return result.imported
    },

    dismissDeviceTrips() {
      const { account } = get()
      if (account) writeFlag(offerKey(account.id), true)
      set({ deviceTripsOffer: null })
    },

    async addSampleTrips() {
      const { account } = get()
      if (!account) return 0
      const trips = await loadSampleTrips(account.name)
      for (const trip of trips) {
        await tripStore.saveTrip(trip)
      }
      bump()
      return trips.length
    },

    async removeSampleTrips() {
      const samples = (await tripStore.listAllTrips()).filter(isSampleTrip)
      for (const trip of samples) await tripStore.deleteTrip(trip.id)
      bump()
      return samples.length
    },
  }
})
