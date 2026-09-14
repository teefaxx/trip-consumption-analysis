import { pathLengthKm } from './distance'
import { computeLegEmissions } from './emissions'
import { FACTORS, type EmissionFactor } from './factors'
import { isRushHour } from './rushHour'
import { summarize } from './summary'
import type { ModeId, Trackpoint, Trip, Tripleg } from './types'
import { lv95ToWgs84 } from './lv95'
import { parseWkbLineStringHex } from './wkb'
import { zurichLocalToEpoch } from './zurichTime'

export interface ParseLegacyCsvOptions {
  /** Only rows for this `user_id` are imported. */
  userId: number
  profileName: string
  factors?: readonly EmissionFactor[]
  tz?: string
}

export interface ParseLegacyCsvResult {
  trips: Trip[]
  skippedRows: number
  warnings: string[]
}

interface LegacyRow {
  modeTypeId: number
  tripId: string
  userId: number
  geometryHex: string
  startTime: string // "DD.MM.YY HH:MM"
  lengthM: number
  rowNumber: number // 1-based, header excluded — for warnings/diagnostics
}

/**
 * Splits one CSV line on commas. The legacy export is comma-separated with
 * no quoting (see docs/modernization-plan.md §3 "Option A"), so a plain
 * split is sufficient — no CSV-quoting edge cases to handle.
 */
function splitCsvLine(line: string): string[] {
  return line.split(',')
}

function parseHeader(headerLine: string): Record<string, number[]> {
  const columns = splitCsvLine(headerLine).map((c) => c.trim())
  const indexes: Record<string, number[]> = {}
  columns.forEach((name, i) => {
    ;(indexes[name] ??= []).push(i)
  })
  return indexes
}

/** "DD.MM.YY HH:MM" -> { year, month, day, hour, minute } (2-digit year, 20xx). */
function parseSwissDateTime(text: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const match = /^(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/.exec(text.trim())
  if (!match) {
    throw new Error(`parseLegacyCsv: unrecognised start_time "${text}"`)
  }
  const [, dd, mm, yy, hh, min] = match
  return {
    year: 2000 + Number(yy),
    month: Number(mm),
    day: Number(dd),
    hour: Number(hh),
    minute: Number(min),
  }
}

/**
 * Parses a legacy `tripleg` CSV export (see docs/modernization-plan.md §3
 * "Option A" for the exact format) for one `user_id`, producing `Trip`s
 * with recomputed energy/CO2 using the current factor table and corrected
 * rush-hour rule.
 *
 * `tot_mj`/`tot_co2` from the file are ignored — everything is recomputed.
 * Legacy rows carry no end time, so every leg's `durationMs` (and every
 * trip's `totals.travelMs`) is 0; the UI must show travel time as "n/a" for
 * these trips (see the `Trip.source` doc comment in types.ts).
 *
 * Trip ids are deterministic (`legacy-2022-u<userId>-t<trip_id>`) so
 * re-importing the same file is a no-op via the store's existing
 * id-based `importAll` de-duplication.
 */
export function parseLegacyCsv(
  text: string,
  opts: ParseLegacyCsvOptions,
): ParseLegacyCsvResult {
  const { userId, profileName, factors = FACTORS, tz = 'Europe/Zurich' } = opts

  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { trips: [], skippedRows: 0, warnings: [] }
  }

  const header = parseHeader(lines[0])
  const required = [
    'mode_type_id',
    'trip_id',
    'user_id',
    'geometry',
    'start_time',
    'length',
  ] as const
  for (const col of required) {
    if (!header[col] || header[col].length === 0) {
      throw new Error(`parseLegacyCsv: missing required column "${col}"`)
    }
  }
  const modeTypeIdIdx = header.mode_type_id[0]
  const tripIdIdx = header.trip_id[0]
  const userIdIdx = header.user_id[0]
  const geometryIdx = header.geometry[0]
  const startTimeIdx = header.start_time[0]
  // Two "length" columns (metres, then km) — take the first: metres.
  const lengthMIdx = header.length[0]

  const warnings: string[] = []
  let skippedRows = 0
  const rows: LegacyRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i // 1-based data row number (header excluded)
    const cols = splitCsvLine(lines[i])
    const userId_ = Number(cols[userIdIdx])
    if (userId_ !== userId) continue

    rows.push({
      modeTypeId: Number(cols[modeTypeIdIdx]),
      tripId: cols[tripIdIdx].trim(),
      userId: userId_,
      geometryHex: cols[geometryIdx].trim(),
      startTime: cols[startTimeIdx],
      lengthM: Number(cols[lengthMIdx]),
      rowNumber,
    })
  }

  // Group consecutive rows (of this user) by trip_id, in file order.
  const tripGroups: LegacyRow[][] = []
  for (const row of rows) {
    const currentGroup = tripGroups[tripGroups.length - 1]
    const currentTripId = currentGroup?.[0]?.tripId
    if (currentGroup && currentTripId === row.tripId) {
      currentGroup.push(row)
    } else {
      tripGroups.push([row])
    }
  }

  const trips: Trip[] = []

  for (const group of tripGroups) {
    const legs: Tripleg[] = []

    for (const row of group) {
      let coordsLv95: [number, number][]
      try {
        coordsLv95 = parseWkbLineStringHex(row.geometryHex)
      } catch (err) {
        skippedRows++
        warnings.push(
          `Row ${row.rowNumber} (trip ${row.tripId}): could not parse geometry — ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
        continue
      }

      if (coordsLv95.length < 2) {
        skippedRows++
        warnings.push(
          `Row ${row.rowNumber} (trip ${row.tripId}): geometry has fewer than 2 points, skipped`,
        )
        continue
      }

      const mode = row.modeTypeId as ModeId
      const { year, month, day, hour, minute } = parseSwissDateTime(row.startTime)
      const startT = zurichLocalToEpoch(year, month, day, hour, minute, tz)
      const endT = startT

      const coordsWgs84 = coordsLv95.map(([e, n]) => lv95ToWgs84(e, n))
      const points: Trackpoint[] = coordsWgs84.map(({ lat, lon }) => ({
        t: startT,
        lat,
        lon,
        acc: 0,
        mode,
      }))

      const distanceKm = pathLengthKm(points)
      const durationMs = 0
      const rushHour = isRushHour(startT, tz)
      const { mj, kgCo2 } = computeLegEmissions(mode, distanceKm, rushHour, factors)

      legs.push({
        mode,
        startT,
        endT,
        points,
        distanceKm,
        durationMs,
        rushHour,
        mj,
        kgCo2,
        geometry: {
          type: 'LineString',
          coordinates: coordsWgs84.map(({ lon, lat }) => [lon, lat]),
        },
      })
    }

    if (legs.length === 0) continue

    const tripId = group[0].tripId
    const totals = summarize(legs)
    const trip: Trip = {
      id: `legacy-2022-u${userId}-t${tripId}`,
      profileName,
      startT: legs[0].startT,
      endT: legs[legs.length - 1].startT,
      legs,
      totals,
      source: 'legacy-csv',
    }
    trips.push(trip)
  }

  return { trips, skippedRows, warnings }
}
