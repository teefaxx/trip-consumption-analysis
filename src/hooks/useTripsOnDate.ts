import { useCallback, useEffect, useState } from 'react'
import type { Trip } from '../lib'
import { tripStore } from '../storage/dexieStore'
import { useAccountStore } from '../store/accountStore'

export interface UseTripsOnDateResult {
  trips: Trip[]
  loading: boolean
  reload: () => void
}

/** Loads the trips saved on a given Zurich-local calendar date ('YYYY-MM-DD'), reloadable. */
export function useTripsOnDate(dateISO: string): UseTripsOnDateResult {
  const [trips, setTrips] = useState<Trip[]>([])
  const [generation, setGeneration] = useState(0)
  // Tracks which (date, generation) pair `trips` currently reflects, so
  // `loading` can be derived during render instead of set from inside the
  // effect after the awaited load resolves.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  // Account switches and sync pulls change the data underneath us.
  const dataVersion = useAccountStore((s) => s.dataVersion)
  const reload = useCallback(() => setGeneration((g) => g + 1), [])

  const requestedKey = `${dateISO}:${generation}:${dataVersion}`

  useEffect(() => {
    let cancelled = false
    void tripStore.listTripsOnDate(dateISO).then((result) => {
      if (cancelled) return
      setTrips(result)
      setLoadedKey(requestedKey)
    })
    return () => {
      cancelled = true
    }
  }, [dateISO, generation, dataVersion, requestedKey])

  return { trips, loading: loadedKey !== requestedKey, reload }
}
