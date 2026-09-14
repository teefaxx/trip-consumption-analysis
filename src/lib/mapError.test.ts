import { describe, expect, it } from 'vitest'
import { describeMapError } from './mapError'

const origin = 'https://teefaxx.github.io'

describe('describeMapError', () => {
  it('names the token for 401', () => {
    const msg = describeMapError(Object.assign(new Error('Unauthorized'), { status: 401 }), origin)
    expect(msg).toContain('401')
    expect(msg).toContain('MAPBOX_TOKEN')
  })

  it('names the origin to allow for 403', () => {
    const msg = describeMapError(Object.assign(new Error('Forbidden'), { status: 403 }), origin)
    expect(msg).toContain('403')
    expect(msg).toContain(origin)
  })

  it('falls back to the error message without a status', () => {
    expect(describeMapError(new Error('Failed to fetch'), origin)).toBe('Map error: Failed to fetch')
  })
})
