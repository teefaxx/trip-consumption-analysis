import { describe, expect, it } from 'vitest'
import { isRushHour } from './rushHour'

/**
 * Builds the epoch ms for a given Europe/Zurich wall-clock time, given the
 * UTC offset in hours for that date (January: CET = UTC+1, July: CEST =
 * UTC+2). Constructed explicitly rather than via a date library, matching
 * how isRushHour itself avoids one.
 */
function zurichEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  offsetHours: number,
): number {
  return Date.UTC(year, month - 1, day, hour - offsetHours, minute, 0)
}

const CASES: Array<[hour: number, minute: number, expected: boolean]> = [
  [6, 59, false],
  [7, 0, true],
  [9, 59, true],
  [10, 0, false],
  [16, 29, false],
  [16, 30, true],
  [19, 29, true],
  [19, 30, false],
  [12, 0, false],
  [3, 0, false],
]

describe('isRushHour', () => {
  describe('January (CET, UTC+1)', () => {
    for (const [hour, minute, expected] of CASES) {
      it(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} -> ${expected}`, () => {
        const t = zurichEpoch(2026, 1, 15, hour, minute, 1)
        expect(isRushHour(t)).toBe(expected)
      })
    }
  })

  describe('July (CEST, UTC+2)', () => {
    for (const [hour, minute, expected] of CASES) {
      it(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} -> ${expected}`, () => {
        const t = zurichEpoch(2026, 7, 15, hour, minute, 2)
        expect(isRushHour(t)).toBe(expected)
      })
    }
  })

  it('guards against the legacy UTC bug: 12:00 UTC in July (14:00 Zurich) is not rush hour', () => {
    const t = Date.UTC(2026, 6, 15, 12, 0, 0)
    expect(isRushHour(t)).toBe(false)
  })

  it('guards against the legacy UTC bug: 06:30 UTC in July (08:30 Zurich) is rush hour', () => {
    const t = Date.UTC(2026, 6, 15, 6, 30, 0)
    expect(isRushHour(t)).toBe(true)
  })
})
