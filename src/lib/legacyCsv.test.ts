import { describe, expect, it } from 'vitest'
import { parseLegacyCsv } from './legacyCsv'

const WKB_LINESTRING = 2

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Encodes a LineString to little-endian hex WKB with no SRID — the format
 * documented for the real 2022 export (docs/modernization-plan.md §3
 * "Option A"). Same DataView approach as src/lib/wkb.test.ts.
 */
function encodeLv95LineStringHex(points: [number, number][]): string {
  const byteLength = 1 + 4 + 4 + points.length * 16
  const buffer = new ArrayBuffer(byteLength)
  const view = new DataView(buffer)
  let offset = 0

  view.setUint8(offset, 1) // little-endian
  offset += 1
  view.setUint32(offset, WKB_LINESTRING, true)
  offset += 4
  view.setUint32(offset, points.length, true)
  offset += 4

  for (const [x, y] of points) {
    view.setFloat64(offset, x, true)
    offset += 8
    view.setFloat64(offset, y, true)
    offset += 8
  }

  return bytesToHex(new Uint8Array(buffer))
}

/** Planar (LV95) length of a polyline, metres — for filling the fixture's `length` column. */
function planarLengthM(points: [number, number][]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1]
    const [x2, y2] = points[i]
    total += Math.hypot(x2 - x1, y2 - y1)
  }
  return total
}

// A handful of LV95 points near Zurich main station.
const P1: [number, number] = [2_683_000, 1_247_600]
const P2: [number, number] = [2_683_200, 1_247_750]
const P3: [number, number] = [2_683_450, 1_247_900]
// A second cluster (user 2's trip), elsewhere in the canton.
const Q1: [number, number] = [2_680_000, 1_245_000]
const Q2: [number, number] = [2_680_300, 1_245_200]

const tramLeg = [P1, P2] as [number, number][]
const neutralLeg = [P2, P3] as [number, number][]
const trainLeg = [P1, P2, P3] as [number, number][]
const user2Leg = [Q1, Q2] as [number, number][]

const HEADER = 'mode_type_id,tot_mj,tot_co2,trip_id,user_id,geometry,start_time,date,length,length'

function csvRow(fields: (string | number)[]): string {
  return fields.join(',')
}

function buildFixture(): string {
  const rows = [
    HEADER,
    // user 1, trip 1, leg 1: tram, 08:05 (morning rush hour)
    csvRow([
      4,
      0,
      0,
      1,
      1,
      encodeLv95LineStringHex(tramLeg),
      '14.12.22 08:05',
      '14.12.22',
      planarLengthM(tramLeg).toFixed(2),
      (planarLengthM(tramLeg) / 1000).toFixed(3),
    ]),
    // user 1, trip 1, leg 2: CO2-neutral, 08:20 (still morning rush hour)
    csvRow([
      6,
      0,
      0,
      1,
      1,
      encodeLv95LineStringHex(neutralLeg),
      '14.12.22 08:20',
      '14.12.22',
      planarLengthM(neutralLeg).toFixed(2),
      (planarLengthM(neutralLeg) / 1000).toFixed(3),
    ]),
    // user 1, trip 2, leg 1: train, 13:00 (not rush hour)
    csvRow([
      2,
      0,
      0,
      2,
      1,
      encodeLv95LineStringHex(trainLeg),
      '14.12.22 13:00',
      '14.12.22',
      planarLengthM(trainLeg).toFixed(2),
      (planarLengthM(trainLeg) / 1000).toFixed(3),
    ]),
    // user 2, trip 3, leg 1: car
    csvRow([
      1,
      0,
      0,
      3,
      2,
      encodeLv95LineStringHex(user2Leg),
      '14.12.22 09:00',
      '14.12.22',
      planarLengthM(user2Leg).toFixed(2),
      (planarLengthM(user2Leg) / 1000).toFixed(3),
    ]),
  ]
  return rows.join('\n')
}

describe('parseLegacyCsv', () => {
  it('imports only the requested user, grouping consecutive rows into trips', () => {
    const csv = buildFixture()
    const { trips, skippedRows, warnings } = parseLegacyCsv(csv, {
      userId: 1,
      profileName: 'Dario',
    })

    expect(skippedRows).toBe(0)
    expect(warnings).toEqual([])
    expect(trips).toHaveLength(2)

    const legCount = trips.reduce((n, t) => n + t.legs.length, 0)
    expect(legCount).toBe(3)

    // Deterministic ids.
    expect(trips.map((t) => t.id).sort()).toEqual(
      ['legacy-2022-u1-t1', 'legacy-2022-u1-t2'].sort(),
    )

    const trip1 = trips.find((t) => t.id === 'legacy-2022-u1-t1')!
    const trip2 = trips.find((t) => t.id === 'legacy-2022-u1-t2')!

    expect(trip1.legs).toHaveLength(2)
    expect(trip2.legs).toHaveLength(1)

    // source and unknown-duration handling.
    for (const trip of trips) {
      expect(trip.source).toBe('legacy-csv')
      expect(trip.totals.travelMs).toBe(0)
    }

    // Distance matches the fixture's planar length within 0.5%.
    const tramTripleg = trip1.legs[0]
    expect(tramTripleg.mode).toBe(4)
    expect(tramTripleg.distanceKm).toBeCloseTo(planarLengthM(tramLeg) / 1000, 2)
    const relErrorTram =
      Math.abs(tramTripleg.distanceKm - planarLengthM(tramLeg) / 1000) /
      (planarLengthM(tramLeg) / 1000)
    expect(relErrorTram).toBeLessThan(0.005)

    const neutralTripleg = trip1.legs[1]
    expect(neutralTripleg.mode).toBe(6)
    const relErrorNeutral =
      Math.abs(neutralTripleg.distanceKm - planarLengthM(neutralLeg) / 1000) /
      (planarLengthM(neutralLeg) / 1000)
    expect(relErrorNeutral).toBeLessThan(0.005)

    const trainTripleg = trip2.legs[0]
    expect(trainTripleg.mode).toBe(2)
    const relErrorTrain =
      Math.abs(trainTripleg.distanceKm - planarLengthM(trainLeg) / 1000) /
      (planarLengthM(trainLeg) / 1000)
    expect(relErrorTrain).toBeLessThan(0.005)

    // Rush hour: tram leg at 08:05 is rush hour, train leg at 13:00 is not.
    expect(tramTripleg.rushHour).toBe(true)
    expect(trainTripleg.rushHour).toBe(false)
  })

  it('excludes other users entirely', () => {
    const csv = buildFixture()
    const { trips } = parseLegacyCsv(csv, { userId: 1, profileName: 'Dario' })
    expect(trips.every((t) => t.id.startsWith('legacy-2022-u1-'))).toBe(true)
  })

  it('produces deterministic ids, so importing the same file twice yields the same ids', () => {
    const csv = buildFixture()
    const first = parseLegacyCsv(csv, { userId: 2, profileName: 'Luca' })
    const second = parseLegacyCsv(csv, { userId: 2, profileName: 'Luca' })
    expect(first.trips.map((t) => t.id)).toEqual(second.trips.map((t) => t.id))
    expect(first.trips.map((t) => t.id)).toEqual(['legacy-2022-u2-t3'])
  })

  it('skips a row whose geometry has fewer than 2 points, with a warning', () => {
    const singlePointHex = encodeLv95LineStringHex([P1])
    const csv = [
      buildFixture(),
      csvRow([4, 0, 0, 4, 1, singlePointHex, '14.12.22 10:15', '14.12.22', '0.00', '0.000']),
    ].join('\n')

    const { trips, skippedRows, warnings } = parseLegacyCsv(csv, {
      userId: 1,
      profileName: 'Dario',
    })

    expect(skippedRows).toBe(1)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/fewer than 2 points/i)
    // The 2 well-formed trips are still returned; the bad row's own
    // (otherwise standalone) trip 4 contributes no trip at all.
    expect(trips).toHaveLength(2)
  })
})
