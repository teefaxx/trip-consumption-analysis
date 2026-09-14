import { describe, expect, it } from 'vitest'
import { cleanTrackpoints } from './clean'
import type { ModeId, Trackpoint } from './types'

const CENTER = { lat: 47.3779, lon: 8.5403 }
const METERS_PER_DEG_LAT = 111_320
const metersPerDegLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180)

/** A point offset from CENTER by dNorthM metres north and dEastM metres east. */
function near(dNorthM: number, dEastM: number) {
  return {
    lat: CENTER.lat + dNorthM / METERS_PER_DEG_LAT,
    lon: CENTER.lon + dEastM / metersPerDegLon(CENTER.lat),
  }
}

function tp(t: number, ll: { lat: number; lon: number }, acc: number, mode: ModeId): Trackpoint {
  return { t, lat: ll.lat, lon: ll.lon, acc, mode }
}

describe('cleanTrackpoints', () => {
  it('collapses a stationary jittery cluster to at most 3 points', () => {
    const points: Trackpoint[] = []
    for (let i = 0; i < 50; i++) {
      // Points on a circle of radius 4.5 m around CENTER: any two points on
      // this circle are at most 9 m apart (< the 10 m accuracy threshold),
      // so the displacement filter collapses the whole cluster.
      const angle = (2 * Math.PI * i) / 50
      const ll = near(4.5 * Math.sin(angle), 4.5 * Math.cos(angle))
      points.push(tp(i * 1000, ll, 10, 1))
    }
    const kept = cleanTrackpoints(points)
    expect(kept.length).toBeLessThanOrEqual(3)
  })

  it('drops a point whose accuracy exceeds the threshold', () => {
    const points: Trackpoint[] = [
      tp(0, near(0, 0), 10, 1),
      tp(10_000, near(200, 0), 600, 1),
      tp(20_000, near(400, 0), 10, 1),
    ]
    const kept = cleanTrackpoints(points, { maxAccuracyM: 500 })
    expect(kept.every((p) => p.acc <= 500)).toBe(true)
    expect(kept.some((p) => p.acc === 600)).toBe(false)
    expect(kept).toHaveLength(2)
  })

  it('drops an implausible 5 km / 10 s teleport at car mode', () => {
    const points: Trackpoint[] = [
      tp(0, near(0, 0), 10, 1),
      tp(10_000, near(5000, 0), 10, 1), // 5 km in 10 s = 1800 km/h, car max is 200
    ]
    const kept = cleanTrackpoints(points)
    expect(kept).toHaveLength(1)
    expect(kept[0].t).toBe(0)
  })

  it('keeps a mode-switch point even within the displacement radius', () => {
    const points: Trackpoint[] = [
      tp(0, near(0, 0), 10, 1),
      tp(5000, near(2, 0), 10, 2), // mode switch car -> train, 2 m away
    ]
    const kept = cleanTrackpoints(points)
    expect(kept).toHaveLength(2)
    expect(kept[1].mode).toBe(2)
  })
})
