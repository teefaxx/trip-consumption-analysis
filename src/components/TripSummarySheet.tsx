import { formatDuration, MODES } from '../lib'
import type { Trip } from '../lib'

interface TripSummarySheetProps {
  trip: Trip
  onDone: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  )
}

/**
 * Shown after a successful "End trip": totals, then a per-leg breakdown.
 * Rounding for display happens only here — the calculation engine never
 * rounds.
 */
export default function TripSummarySheet({ trip, onDone }: TripSummarySheetProps) {
  const { totals } = trip

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Trip summary</h2>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Stat label="Distance" value={`${totals.distanceKm.toFixed(2)} km`} />
          <Stat label="Energy" value={`${totals.mj.toFixed(2)} MJ`} />
          <Stat label="CO₂" value={`${totals.kgCo2.toFixed(3)} kg`} />
          <Stat label="Travel time" value={formatDuration(totals.travelMs)} />
        </div>

        <ul className="mb-4 divide-y divide-gray-100 border-y border-gray-100">
          {trip.legs.map((leg, i) => {
            const modeInfo = MODES[leg.mode]
            return (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-medium text-gray-900">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: modeInfo.color }}
                  />
                  {modeInfo.label}
                  {leg.rushHour && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Rush hour
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-gray-500">
                  {leg.distanceKm.toFixed(2)} km &middot; {formatDuration(leg.durationMs)}
                </span>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-gray-900 py-3 text-base font-semibold text-white active:bg-gray-800"
        >
          Done
        </button>
      </div>
    </div>
  )
}
