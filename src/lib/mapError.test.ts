import { describe, expect, it } from 'vitest'
import { describeMapError } from './mapError'

const origin = 'https://teefaxx.github.io'
const url = 'https://api.mapbox.com/styles/v1/mapbox/standard?access_token=pk.secret'

describe('describeMapError', () => {
  it('names the token for 401', () => {
    const msg = describeMapError({ message: 'Unauthorized', status: 401, url }, origin)
    expect(msg).toContain('401')
    expect(msg).toContain('MAPBOX_TOKEN')
  })

  it('names the endpoint and the origin to allow for 403, without the token', () => {
    const msg = describeMapError({ message: 'Forbidden', status: 403, url }, origin)
    expect(msg).toContain('403')
    expect(msg).toContain('api.mapbox.com/styles/v1/mapbox/standard')
    expect(msg).toContain(origin)
    expect(msg).not.toContain('pk.secret')
  })

  it('copes with a missing or malformed url', () => {
    expect(describeMapError({ message: 'Forbidden', status: 403 }, origin)).toContain('a request')
    expect(describeMapError({ message: 'Forbidden', status: 403, url: '::' }, origin)).toContain(
      'a request',
    )
  })

  it('falls back to the error message without a status', () => {
    expect(describeMapError({ message: 'Failed to fetch' }, origin)).toBe(
      'Map error: Failed to fetch',
    )
  })
})
