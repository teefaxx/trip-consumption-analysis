import { useCallback, useEffect, useState } from 'react'
import type { Trip } from '../lib'
import { tripStore } from '../storage/dexieStore'

export interface UseTripsOnDateResult {
  trips: Trip[]
  loading: boolean
  reload: () => void
}

/** Loads the trips saved on a given Zurich-local calendar date ('YYYY-MM-DD'), reloadable. */
export function useTripsOnDate(dateISO: string): UseTripsOnDateResult {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [generation, setGeneration] = useState(0)

  const reload = useCallback(() => setGeneration((g) => g + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void tripStore.listTripsOnDate(dateISO).then((result) => {
      if (cancelled) return
      setTrips(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [dateISO, generation])

  return { trips, loading, reload }
}
