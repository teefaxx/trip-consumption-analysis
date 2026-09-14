import { describe, expect, it } from 'vitest'
import { parseWkbLineStringHex } from './wkb'

const SRID_FLAG = 0x20000000
const WKB_LINESTRING = 2

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Encodes a LineString to WKB, little-endian, optionally with an EWKB SRID. */
function encodeLineStringHex(points: [number, number][], srid?: number): string {
  const hasSrid = srid !== undefined
  const byteLength = 1 + 4 + (hasSrid ? 4 : 0) + 4 + points.length * 16
  const buffer = new ArrayBuffer(byteLength)
  const view = new DataView(buffer)
  let offset = 0

  view.setUint8(offset, 1) // little-endian
  offset += 1

  const type = hasSrid ? WKB_LINESTRING | SRID_FLAG : WKB_LINESTRING
  view.setUint32(offset, type, true)
  offset += 4

  if (hasSrid) {
    view.setUint32(offset, srid, true)
    offset += 4
  }

  view.setUint32(offset, points.length, true)
  offset += 4

  for (const [x, y] of points) {
    view.setFloat64(offset, x, true)
    offset += 8
    view.setFloat64(offset, y, true)
    offset += 8
  }

  return bytesToHex(new Uint8Array(buffer))
}

/** Same as encodeLineStringHex but big-endian. */
function encodeLineStringHexBigEndian(points: [number, number][]): string {
  const byteLength = 1 + 4 + 4 + points.length * 16
  const buffer = new ArrayBuffer(byteLength)
  const view = new DataView(buffer)
  let offset = 0

  view.setUint8(offset, 0) // big-endian
  offset += 1

  view.setUint32(offset, WKB_LINESTRING, false)
  offset += 4

  view.setUint32(offset, points.length, false)
  offset += 4

  for (const [x, y] of points) {
    view.setFloat64(offset, x, false)
    offset += 8
    view.setFloat64(offset, y, false)
    offset += 8
  }

  return bytesToHex(new Uint8Array(buffer))
}

const POINTS: [number, number][] = [
  [2_683_000.12, 1_247_600.5],
  [2_683_100.0, 1_247_650.25],
  [2_683_250.75, 1_247_720.1],
]

describe('parseWkbLineStringHex', () => {
  it('round-trips a little-endian LineString with no SRID', () => {
    const hex = encodeLineStringHex(POINTS)
    expect(parseWkbLineStringHex(hex)).toEqual(POINTS)
  })

  it('round-trips a little-endian LineString with an EWKB SRID flag (2056)', () => {
    const hex = encodeLineStringHex(POINTS, 2056)
    expect(parseWkbLineStringHex(hex)).toEqual(POINTS)
  })

  it('round-trips a big-endian LineString', () => {
    const hex = encodeLineStringHexBigEndian(POINTS)
    expect(parseWkbLineStringHex(hex)).toEqual(POINTS)
  })

  it('throws a descriptive error for an unsupported geometry type', () => {
    // Point (type 1) instead of LineString (type 2).
    const buffer = new ArrayBuffer(1 + 4)
    const view = new DataView(buffer)
    view.setUint8(0, 1)
    view.setUint32(1, 1, true)
    expect(() => parseWkbLineStringHex(bytesToHex(new Uint8Array(buffer)))).toThrow(
      /unsupported geometry type/i,
    )
  })

  it('throws a descriptive error on truncated data', () => {
    const hex = encodeLineStringHex(POINTS)
    const truncated = hex.slice(0, hex.length - 20)
    expect(() => parseWkbLineStringHex(truncated)).toThrow(/truncated/i)
  })
})
