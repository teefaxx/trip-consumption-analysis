import { describe, expect, it } from 'vitest'
import { buildTraceFeatureCollection } from './trace'
import type { Trackpoint } from './types'

function pt(t: number, lat: number, lon: number, mode: Trackpoint['mode']): Trackpoint {
  return { t, lat, lon, acc: 5, mode }
}

describe('buildTraceFeatureCollection', () => {
  it('returns no features for an empty input', () => {
    const fc = buildTraceFeatureCollection([])
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(0)
  })

  it('returns one feature with N coordinates for a single-mode run', () => {
    const points: Trackpoint[] = [
      pt(0, 47.36, 8.54, 6),
      pt(1000, 47.361, 8.541, 6),
      pt(2000, 47.362, 8.542, 6),
      pt(3000, 47.363, 8.543, 6),
      pt(4000, 47.364, 8.544, 6),
    ]

    const fc = buildTraceFeatureCollection(points)

    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].properties.mode).toBe(6)
    expect(fc.features[0].geometry.coordinates).toHaveLength(points.length)
    expect(fc.features[0].geometry.coordinates).toEqual(points.map((p) => [p.lon, p.lat]))
  })

  it('returns two features for a mode switch, the second starting where the first ended', () => {
    const walk: Trackpoint[] = [
      pt(0, 47.36, 8.54, 6),
      pt(1000, 47.361, 8.541, 6),
      pt(2000, 47.362, 8.542, 6),
    ]
    const tram: Trackpoint[] = [
      pt(3000, 47.363, 8.543, 4),
      pt(4000, 47.364, 8.544, 4),
      pt(5000, 47.365, 8.545, 4),
    ]

    const fc = buildTraceFeatureCollection([...walk, ...tram])

    expect(fc.features).toHaveLength(2)
    expect(fc.features[0].properties.mode).toBe(6)
    expect(fc.features[1].properties.mode).toBe(4)

    const firstFeatureCoords = fc.features[0].geometry.coordinates
    const secondFeatureCoords = fc.features[1].geometry.coordinates
    const lastOfFirst = firstFeatureCoords[firstFeatureCoords.length - 1]

    expect(secondFeatureCoords[0]).toEqual(lastOfFirst)
    // The rest of the second run's own points follow the connecting point.
    expect(secondFeatureCoords.slice(1)).toEqual(tram.map((p) => [p.lon, p.lat]))
  })

  it('skips a single-point run but still uses it to connect the next run', () => {
    const points: Trackpoint[] = [
      pt(0, 47.36, 8.54, 6),
      pt(1000, 47.361, 8.541, 6),
      pt(2000, 47.362, 8.542, 3), // single-point bus "run"
      pt(3000, 47.363, 8.543, 4),
      pt(4000, 47.364, 8.544, 4),
    ]

    const fc = buildTraceFeatureCollection(points)

    expect(fc.features).toHaveLength(2)
    expect(fc.features[0].properties.mode).toBe(6)
    expect(fc.features[1].properties.mode).toBe(4)

    // The bus point (dropped as its own feature) still anchors the tram run.
    expect(fc.features[1].geometry.coordinates[0]).toEqual([8.542, 47.362])
  })
})
