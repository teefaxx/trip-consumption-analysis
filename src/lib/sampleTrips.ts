import { analyzeTrip } from './analyze'
import { addDaysIso, localDate } from './dates'
import { haversineKm } from './distance'
import type { ModeId, Trackpoint, Trip } from './types'
import { zurichLocalToEpoch } from './zurichTime'

/** Prefix of every sample trip id — lets the UI badge and bulk-remove them. */
export const SAMPLE_ID_PREFIX = 'sample-'

export function isSampleTrip(trip: Pick<Trip, 'id' | 'source'>): boolean {
  return trip.source === 'sample' || trip.id.startsWith(SAMPLE_ID_PREFIX)
}

type LatLon = [lat: number, lon: number]

interface LegSpec {
  mode: ModeId
  /** Average speed for the synthetic trace, km/h. */
  kmh: number
  route: LatLon[]
}

interface TripSpec {
  /** Days before today (Zurich). */
  daysAgo: number
  hour: number
  minute: number
  legs: LegSpec[]
}

// Plausible everyday trips around Zurich. Coordinates are approximate.
const HOME: LatLon = [47.4155, 8.552]
const OERLIKON: LatLon = [47.4116, 8.5444]
const WIPKINGEN: LatLon = [47.393, 8.529]
const ZURICH_HB: LatLon = [47.3779, 8.5403]
const CENTRAL: LatLon = [47.3767, 8.5442]
const ETH: LatLon = [47.3765, 8.548]
const MILCHBUCK: LatLon = [47.387, 8.544]
const WINTERTHUR: LatLon = [47.4999, 8.7238]

const SPECS: TripSpec[] = [
  {
    daysAgo: 1,
    hour: 7,
    minute: 40,
    legs: [
      { mode: 6, kmh: 5, route: [HOME, [47.4135, 8.549], OERLIKON] },
      { mode: 2, kmh: 55, route: [OERLIKON, [47.4045, 8.535], WIPKINGEN, ZURICH_HB] },
      { mode: 4, kmh: 15, route: [ZURICH_HB, CENTRAL, ETH] },
    ],
  },
  {
    daysAgo: 1,
    hour: 17,
    minute: 25,
    legs: [{ mode: 5, kmh: 22, route: [ETH, MILCHBUCK, [47.399, 8.545], OERLIKON, HOME] }],
  },
  {
    daysAgo: 2,
    hour: 9,
    minute: 10,
    legs: [
      {
        mode: 1,
        kmh: 70,
        route: [HOME, [47.431, 8.57], [47.456, 8.637], [47.489, 8.7], WINTERTHUR],
      },
      { mode: 3, kmh: 20, route: [WINTERTHUR, [47.5045, 8.737], [47.5096, 8.7558]] },
    ],
  },
  {
    daysAgo: 2,
    hour: 16,
    minute: 50,
    legs: [
      { mode: 3, kmh: 20, route: [[47.5096, 8.7558], [47.5045, 8.737], WINTERTHUR] },
      { mode: 2, kmh: 90, route: [WINTERTHUR, [47.456, 8.62], OERLIKON] },
      { mode: 6, kmh: 5, route: [OERLIKON, [47.4135, 8.549], HOME] },
    ],
  },
]

const STEP_MS = 10_000
const MODE_SWITCH_PAUSE_MS = 3 * 60_000

/** Interpolates a route into trackpoints spaced STEP_MS apart at a constant speed. */
function traceLeg(leg: LegSpec, startT: number): Trackpoint[] {
  const points: Trackpoint[] = []
  let t = startT
  const push = ([lat, lon]: LatLon) => points.push({ t, lat, lon, acc: 8, mode: leg.mode })
  push(leg.route[0])
  for (let i = 1; i < leg.route.length; i++) {
    const [aLat, aLon] = leg.route[i - 1]
    const [bLat, bLon] = leg.route[i]
    const km = haversineKm({ lat: aLat, lon: aLon }, { lat: bLat, lon: bLon })
    const segmentMs = (km / leg.kmh) * 3_600_000
    const steps = Math.max(1, Math.round(segmentMs / STEP_MS))
    for (let s = 1; s <= steps; s++) {
      const f = s / steps
      t += segmentMs / steps
      push([aLat + (bLat - aLat) * f, aLon + (bLon - aLon) * f])
    }
  }
  return points
}

/**
 * Generates a handful of realistic demo trips on the two days before
 * `now`, run through the same analysis pipeline as recorded trips. Ids are
 * fixed, so adding them twice never duplicates.
 */
export function generateSampleTrips(profileName: string, now = Date.now()): Trip[] {
  const today = localDate(now)
  return SPECS.map((spec, index) => {
    const [y, m, d] = addDaysIso(today, -spec.daysAgo).split('-').map(Number)
    let t = zurichLocalToEpoch(y, m, d, spec.hour, spec.minute)
    const points: Trackpoint[] = []
    for (const leg of spec.legs) {
      const legPoints = traceLeg(leg, t)
      points.push(...legPoints)
      t = legPoints[legPoints.length - 1].t + MODE_SWITCH_PAUSE_MS
    }
    const trip = analyzeTrip(points, { profileName })
    return { ...trip, id: `${SAMPLE_ID_PREFIX}${index + 1}`, source: 'sample' as const }
  })
}
