import { useState } from 'react'
import ConfirmDialog from '../ConfirmDialog'
import type { Trip } from '../../lib'

interface TripListProps {
  trips: Trip[]
  onDelete: (tripId: string) => void
}

/** Trip start time as Zurich-local HH:MM. */
function localTime(t: number, tz = 'Europe/Zurich'): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(t))
}

/** One card per trip on the selected day, each with a confirm-guarded delete. */
export default function TripList({ trips, onDelete }: TripListProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (trips.length === 0) {
    return null
  }

  const pendingTrip = trips.find((t) => t.id === pendingDeleteId) ?? null

  return (
    <div className="flex flex-col gap-2">
      {trips.map((trip) => (
        <div
          key={trip.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              {localTime(trip.startT)}
              {trip.source === 'legacy-csv' && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  2022 import
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {trip.legs.length} leg{trip.legs.length === 1 ? '' : 's'} &middot;{' '}
              {trip.totals.distanceKm.toFixed(2)} km &middot; {trip.totals.mj.toFixed(2)} MJ
              &middot; {trip.totals.kgCo2.toFixed(3)} kg
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingDeleteId(trip.id)}
            className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50"
          >
            Delete
          </button>
        </div>
      ))}

      {pendingTrip && (
        <ConfirmDialog
          title="Delete trip?"
          message={`This removes the ${localTime(pendingTrip.startT)} trip permanently.`}
          confirmLabel="Delete"
          onConfirm={() => {
            onDelete(pendingTrip.id)
            setPendingDeleteId(null)
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  )
}
