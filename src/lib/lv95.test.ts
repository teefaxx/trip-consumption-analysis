import { describe, expect, it } from 'vitest'
import { lv95ToWgs84 } from './lv95'

describe('lv95ToWgs84', () => {
  it('converts the LV95 origin (old Bern observatory) within 1e-4 degrees', () => {
    const { lat, lon } = lv95ToWgs84(2_600_000, 1_200_000)
    expect(lat).toBeCloseTo(46.951083, 4)
    expect(lon).toBeCloseTo(7.438639, 4)
  })

  it('converts a point near Zurich main station within 0.01 degrees', () => {
    const { lat, lon } = lv95ToWgs84(2_683_000, 1_248_000)
    expect(lat).toBeCloseTo(47.378, 2)
    expect(lon).toBeCloseTo(8.54, 2)
  })
})
