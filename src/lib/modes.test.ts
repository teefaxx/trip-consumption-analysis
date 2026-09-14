import { describe, expect, it } from 'vitest'
import { MODE_LIST, MODES } from './modes'

describe('modes', () => {
  it('has exactly six entries with unique ids 1-6', () => {
    expect(MODE_LIST).toHaveLength(6)
    const ids = MODE_LIST.map((m) => m.id)
    expect(new Set(ids).size).toBe(6)
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('has unique labels', () => {
    const labels = MODE_LIST.map((m) => m.label)
    expect(new Set(labels).size).toBe(6)
  })

  it('never swaps bus (3) and tram (4)', () => {
    expect(MODES[3].label).toBe('Bus')
    expect(MODES[3].key).toBe('bus')
    expect(MODES[4].label).toBe('Tram')
    expect(MODES[4].key).toBe('tram')
  })
})
