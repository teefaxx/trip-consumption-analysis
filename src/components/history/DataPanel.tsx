import { useRef, useState } from 'react'
import Banner from '../Banner'
import { getProfileName } from '../../storage/profile'
import { tripStore } from '../../storage/dexieStore'
import type { TripExport } from '../../storage/TripStore'
import { parseLegacyCsv, type Trip } from '../../lib'

interface DataPanelProps {
  /** Called after any successful import with the trips that were newly parsed (not filtered by dedup). */
  onImportComplete: (trips: Trip[]) => void
}

const LEGACY_USERS = [
  { id: 1, label: 'Dario' },
  { id: 2, label: 'Luca' },
  { id: 3, label: 'Leo' },
  { id: 4, label: 'Raúl' },
] as const

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Today's date, Zurich-local, formatted as YYYY-MM-DD (for the export filename). */
function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())
}

/**
 * JSON export/import and 2022 CSV import. All three operations report their
 * outcome (or errors) through a status line and a dismissible error banner;
 * a successful import bubbles the parsed trips up to HistoryPage, which
 * decides whether to refresh/jump the selected day.
 */
export default function DataPanel({ onImportComplete }: DataPanelProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [legacyUserId, setLegacyUserId] = useState(1)
  const [busy, setBusy] = useState(false)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setError(null)
    try {
      const data = await tripStore.exportAll()
      downloadJson(`trip-consumption-export-${todayIso()}.json`, data)
      setStatus(`Exported ${data.trips.length} trip${data.trips.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    }
  }

  const handleImportJsonFile = async (file: File) => {
    setError(null)
    setWarnings([])
    setBusy(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<TripExport>
      if (parsed.format !== 'trip-consumption-analysis/v1' || !Array.isArray(parsed.trips)) {
        throw new Error('Not a recognised trip-consumption-analysis export file.')
      }
      const result = await tripStore.importAll(parsed as TripExport)
      setStatus(`Imported ${result.imported}, skipped ${result.skipped}.`)
      onImportComplete(parsed.trips as Trip[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleImportCsvFile = async (file: File) => {
    setError(null)
    setWarnings([])
    setBusy(true)
    try {
      const text = await file.text()
      const { trips, skippedRows, warnings: parseWarnings } = parseLegacyCsv(text, {
        userId: legacyUserId,
        profileName: getProfileName(),
      })
      const legCount = trips.reduce((n, t) => n + t.legs.length, 0)
      const result = await tripStore.importAll({
        format: 'trip-consumption-analysis/v1',
        exportedAt: new Date().toISOString(),
        profileName: getProfileName(),
        trips,
      })
      setStatus(
        `Imported ${result.imported} trip${result.imported === 1 ? '' : 's'} (${legCount} legs), skipped ${skippedRows} rows.`,
      )
      setWarnings(parseWarnings)
      onImportComplete(trips)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Data</h2>

      {error && <Banner tone="error" message={error} onDismiss={() => setError(null)} />}
      {status && !error && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{status}</div>
      )}
      {warnings.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-amber-50 px-6 py-2 text-xs text-amber-800">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={busy}
        className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-900 active:bg-gray-100 disabled:opacity-50"
      >
        Export JSON
      </button>

      <div>
        <button
          type="button"
          onClick={() => jsonInputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-900 active:bg-gray-100 disabled:opacity-50"
        >
          Import JSON
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleImportJsonFile(file)
          }}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <label className="text-xs font-medium text-gray-500">Import 2022 CSV — user</label>
        <select
          value={legacyUserId}
          onChange={(e) => setLegacyUserId(Number(e.target.value))}
          disabled={busy}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
        >
          {LEGACY_USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.id} — {u.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => csvInputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-900 active:bg-gray-100 disabled:opacity-50"
        >
          Import 2022 CSV
        </button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleImportCsvFile(file)
          }}
        />
      </div>
    </div>
  )
}
