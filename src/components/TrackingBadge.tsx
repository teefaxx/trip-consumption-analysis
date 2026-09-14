import { useEffect, useState } from 'react'
import { formatDuration, MODES } from '../lib'
import type { ModeId } from '../lib'

interface TrackingBadgeProps {
  status: 'idle' | 'tracking'
  mode: ModeId | null
  startedAt: number | null
  pointCount: number
  accuracyM: number | null
}

/**
 * Top-left map overlay: current mode, elapsed time (ticking every second),
 * point count and last GPS accuracy while tracking; "Not tracking" while
 * idle.
 */
export default function TrackingBadge({
  status,
  mode,
  startedAt,
  pointCount,
  accuracyM,
}: TrackingBadgeProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (status !== 'tracking') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [status])

  if (status !== 'tracking' || mode === null || startedAt === null) {
    return (
      <div className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-gray-500 shadow backdrop-blur">
        Not tracking
      </div>
    )
  }

  const modeInfo = MODES[mode]
  const elapsed = formatDuration(Math.max(0, now - startedAt))

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-lg bg-white/90 px-3 py-2 text-sm shadow backdrop-blur">
      <div className="flex items-center gap-2 font-semibold text-gray-900">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: modeInfo.color }}
        />
        {modeInfo.label}
      </div>
      <div className="text-gray-600">
        {elapsed} &middot; {pointCount} pt{pointCount === 1 ? '' : 's'}
        {accuracyM !== null ? ` · ±${Math.round(accuracyM)} m` : ''}
      </div>
    </div>
  )
}
