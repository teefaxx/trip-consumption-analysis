import { formatDuration, MODES, summarize } from '../../lib'
import type { ModeId, Totals, Trip } from '../../lib'

type ModeBucket = NonNullable<Totals['byMode'][ModeId]>

interface DayTotalsProps {
  trips: Trip[]
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
 * The day's totals (distance, energy, CO2, travel time) plus a per-mode
 * breakdown. Legacy 2022 trips carry no leg duration (see the `Trip.source`
 * doc comment in lib/types.ts), so travel time reads "n/a" for any day that
 * includes at least one of them, rather than a misleading "0 min".
 */
export default function DayTotals({ trips }: DayTotalsProps) {
  const legs = trips.flatMap((t) => t.legs)
  const totals = summarize(legs)
  const hasLegacyTrip = trips.some((t) => t.source === 'legacy-csv')

  const byModeEntries = Object.entries(totals.byMode)
    .filter((entry): entry is [string, ModeBucket] => entry[1] !== undefined)
    .sort((a, b) => Number(a[0]) - Number(b[0]))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Distance" value={`${totals.distanceKm.toFixed(2)} km`} />
        <Stat label="Energy" value={`${totals.mj.toFixed(2)} MJ`} />
        <Stat label="CO₂" value={`${totals.kgCo2.toFixed(3)} kg`} />
        <Stat
          label="Travel time"
          value={hasLegacyTrip ? 'n/a (2022 import)' : formatDuration(totals.travelMs)}
        />
      </div>

      {byModeEntries.length > 0 && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {byModeEntries.map(([modeId, bucket]) => {
            const modeInfo = MODES[Number(modeId) as ModeId]
            return (
              <li
                key={modeId}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-gray-900">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: modeInfo.color }}
                  />
                  {modeInfo.label}
                </span>
                <span className="shrink-0 text-right text-gray-500">
                  {bucket.distanceKm.toFixed(2)} km &middot; {bucket.mj.toFixed(2)} MJ &middot;{' '}
                  {bucket.kgCo2.toFixed(3)} kg
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
