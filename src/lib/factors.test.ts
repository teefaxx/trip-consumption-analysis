import { describe, expect, it } from 'vitest'
import { FACTORS, getFactor } from './factors'
import { MODE_LIST } from './modes'

describe('factors', () => {
  it('has exactly one entry per mode id', () => {
    expect(FACTORS).toHaveLength(6)
    const modes = FACTORS.map((f) => f.mode).sort((a, b) => a - b)
    expect(modes).toEqual(MODE_LIST.map((m) => m.id).sort((a, b) => a - b))
  })

  it('has non-negative numbers everywhere', () => {
    for (const f of FACTORS) {
      expect(f.mjPerPkm.normal).toBeGreaterThanOrEqual(0)
      expect(f.mjPerPkm.rushHour).toBeGreaterThanOrEqual(0)
      expect(f.kgCo2PerPkm.normal).toBeGreaterThanOrEqual(0)
      expect(f.kgCo2PerPkm.rushHour).toBeGreaterThanOrEqual(0)
    }
  })

  it('rush hour factor is never larger than the normal factor', () => {
    for (const f of FACTORS) {
      expect(f.mjPerPkm.rushHour).toBeLessThanOrEqual(f.mjPerPkm.normal)
      expect(f.kgCo2PerPkm.rushHour).toBeLessThanOrEqual(f.kgCo2PerPkm.normal)
    }
  })

  it('getFactor looks up by mode id', () => {
    expect(getFactor(1).label).toBe('Car')
    expect(getFactor(4).label).toBe('Tram')
  })
})
