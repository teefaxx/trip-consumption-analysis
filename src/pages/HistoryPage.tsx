import { useEffect, useState } from 'react'
import MapView from '../components/MapView'
import DayLegsLayer from '../components/history/DayLegsLayer'
import DayTotals from '../components/history/DayTotals'
import TripList from '../components/history/TripList'
import DataPanel from '../components/history/DataPanel'
import Banner from '../components/Banner'
import { useTripsOnDate } from '../hooks/useTripsOnDate'
import { addDaysIso, localDate, type Trip } from '../lib'
import { tripStore } from '../storage/dexieStore'

export default function HistoryPage() {
  const [dateISO, setDateISO] = useState(() => localDate(Date.now()))
  const { trips, loading, reload } = useTripsOnDate(dateISO)
  const [bounds, setBounds] = useState<{ min: string; max: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Date-input min/max, computed once from whatever is already stored.
  useEffect(() => {
    let cancelled = false
    void tripStore.listAllTrips().then((all) => {
      if (cancelled || all.length === 0) return
      const dates = all.map((t) => localDate(t.startT)).sort()
      setBounds({ min: dates[0], max: dates[dates.length - 1] })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (tripId: string) => {
    setDeleteError(null)
    try {
      await tripStore.deleteTrip(tripId)
      reload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete trip.')
    }
  }

  const handleImportComplete = (imported: Trip[]) => {
    reload()
    if (trips.length === 0 && imported.length > 0) {
      setDateISO(localDate(imported[0].startT))
    }
    // Bounds may have widened (new dates imported) — recompute lazily.
    void tripStore.listAllTrips().then((all) => {
      if (all.length === 0) return
      const dates = all.map((t) => localDate(t.startT)).sort()
      setBounds({ min: dates[0], max: dates[dates.length - 1] })
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">History</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateISO((d) => addDaysIso(d, -1))}
            aria-label="Previous day"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 active:bg-gray-100"
          >
            &lsaquo;
          </button>
          <input
            type="date"
            value={dateISO}
            min={bounds?.min}
            max={bounds?.max}
            onChange={(e) => {
              if (e.target.value) setDateISO(e.target.value)
            }}
            className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          />
          <button
            type="button"
            onClick={() => setDateISO((d) => addDaysIso(d, 1))}
            aria-label="Next day"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 active:bg-gray-100"
          >
            &rsaquo;
          </button>
        </div>
      </header>

      <div className="relative h-[45vh] shrink-0 border-b border-gray-200">
        {/* Absolute wrapper: Mapbox needs a definite pixel height, and
            `height: 100%` does not resolve inside a flex item. */}
        <div className="absolute inset-0">
          <MapView>
            <DayLegsLayer trips={trips} />
          </MapView>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {deleteError && (
          <Banner tone="error" message={deleteError} onDismiss={() => setDeleteError(null)} />
        )}

        {!loading && trips.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
            No trips on this day
          </div>
        )}

        {trips.length > 0 && (
          <>
            <DayTotals trips={trips} />
            <TripList trips={trips} onDelete={(id) => void handleDelete(id)} />
          </>
        )}

        <DataPanel onImportComplete={handleImportComplete} />
      </div>
    </div>
  )
}
