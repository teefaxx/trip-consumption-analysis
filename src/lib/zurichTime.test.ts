import { describe, expect, it } from 'vitest'
import { zurichLocalToEpoch } from './zurichTime'

describe('zurichLocalToEpoch', () => {
  it('converts a winter (CET, UTC+1) Zurich wall-clock time', () => {
    const epoch = zurichLocalToEpoch(2022, 12, 21, 22, 7)
    expect(new Date(epoch).toISOString()).toBe('2022-12-21T21:07:00.000Z')
  })

  it('converts a summer (CEST, UTC+2) Zurich wall-clock time', () => {
    const epoch = zurichLocalToEpoch(2022, 7, 1, 12, 0)
    expect(new Date(epoch).toISOString()).toBe('2022-07-01T10:00:00.000Z')
  })
})
