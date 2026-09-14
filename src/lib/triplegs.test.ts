import { describe, expect, it } from 'vitest'
import { splitTriplegs } from './triplegs'
import type { ModeId, Trackpoint } from './types'

function tp(t: number, mode: ModeId): Trackpoint {
  return { t, lat: 47 + t / 1_000_000, lon: 8, acc: 10, mode }
}

describe('splitTriplegs', () => {
  it('splits 10 points [1x4, 2x6] into two legs of 4 and 6 points', () => {
    const points = [
      ...Array.from({ length: 4 }, (_, i) => tp(i, 1)),
      ...Array.from({ length: 6 }, (_, i) => tp(4 + i, 2)),
    ]
    const { legs, dropped } = splitTriplegs(points)
    expect(dropped).toHaveLength(0)
    expect(legs).toHaveLength(2)
    expect(legs[0].mode).toBe(1)
    expect(legs[0].points).toHaveLength(4)
    expect(legs[1].mode).toBe(2)
    expect(legs[1].points).toHaveLength(6)
  })

  it('keeps 10 same-mode points as a single leg', () => {
    const points = Array.from({ length: 10 }, (_, i) => tp(i, 3))
    const { legs, dropped } = splitTriplegs(points)
    expect(dropped).toHaveLength(0)
    expect(legs).toHaveLength(1)
    expect(legs[0].points).toHaveLength(10)
  })

  it('drops a single-point leg at the end, keeping the other legs intact', () => {
    const points = [
      ...Array.from({ length: 4 }, (_, i) => tp(i, 1)),
      ...Array.from({ length: 3 }, (_, i) => tp(4 + i, 2)),
      tp(7, 5), // single trailing point, different mode
    ]
    const { legs, dropped } = splitTriplegs(points)
    expect(legs).toHaveLength(2)
    expect(legs[0].points).toHaveLength(4)
    expect(legs[1].points).toHaveLength(3)
    expect(dropped).toHaveLength(1)
    expect(dropped[0].mode).toBe(5)
    expect(dropped[0].points).toHaveLength(1)
  })

  it('starts the new leg at the first point carrying the new mode (no off-by-one)', () => {
    const points = [tp(0, 1), tp(1, 1), tp(2, 1), tp(3, 2), tp(4, 2)]
    const { legs } = splitTriplegs(points)
    expect(legs).toHaveLength(2)
    expect(legs[0].points.map((p) => p.t)).toEqual([0, 1, 2])
    expect(legs[1].points.map((p) => p.t)).toEqual([3, 4])
    expect(legs[1].points[0].t).toBe(3)
  })
})
