import { cleanTrackpoints, type CleanOptions } from './clean'
import { buildTripleg } from './emissions'
import { TripTooShortError } from './errors'
import { FACTORS, type EmissionFactor } from './factors'
import { summarize } from './summary'
import { splitTriplegs } from './triplegs'
import type { Trackpoint, Trip } from './types'

export interface AnalyzeOptions {
  profileName: string
  factors?: readonly EmissionFactor[]
  tz?: string
  /** Injectable clock, mainly for tests; unused today but kept for parity with other pure functions. */
  now?: () => number
  clean?: CleanOptions
}

/**
 * Runs the full pipeline — clean, split into triplegs, compute per-leg
 * energy/CO2, summarize — over a raw set of recorded trackpoints.
 */
export function analyzeTrip(rawPoints: readonly Trackpoint[], options: AnalyzeOptions): Trip {
  const { profileName, factors = FACTORS, tz = 'Europe/Zurich', clean } = options

  const cleaned = cleanTrackpoints(rawPoints, clean)
  if (cleaned.length < 2) {
    throw new TripTooShortError()
  }

  const { legs: groups } = splitTriplegs(cleaned)
  const legs = groups.map((group) => buildTripleg(group, factors, tz))
  if (legs.length === 0) {
    throw new TripTooShortError()
  }

  const totals = summarize(legs)

  return {
    id: crypto.randomUUID(),
    profileName,
    startT: cleaned[0].t,
    endT: cleaned[cleaned.length - 1].t,
    legs,
    totals,
  }
}
