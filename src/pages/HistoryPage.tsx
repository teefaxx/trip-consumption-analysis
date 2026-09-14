export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">History</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Past trips, totals and per-mode breakdowns arrive in Phase 3, once the
        local trip store is wired up to the map.
      </p>
    </div>
  )
}
