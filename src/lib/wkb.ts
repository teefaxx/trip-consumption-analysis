const WKB_LINESTRING = 2
const SRID_FLAG = 0x20000000

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim()
  if (clean.length % 2 !== 0) {
    throw new Error(`parseWkbLineStringHex: hex string has odd length (${clean.length})`)
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    const byteHex = clean.slice(i * 2, i * 2 + 2)
    const byte = Number.parseInt(byteHex, 16)
    if (Number.isNaN(byte)) {
      throw new Error(`parseWkbLineStringHex: invalid hex byte "${byteHex}" at offset ${i * 2}`)
    }
    bytes[i] = byte
  }
  return bytes
}

/**
 * Parses a hex-encoded WKB (well-known binary) 2-D LineString into an array
 * of [x, y] coordinate pairs, in the order they appear in the geometry.
 *
 * Handles both byte orders (byte 0: 0x01 little-endian, 0x00 big-endian)
 * and the optional PostGIS "EWKB" SRID flag (bit 0x20000000 set on the
 * geometry type, followed by a uint32 SRID before the point count). Throws
 * a descriptive Error for any geometry type other than LineString, or for
 * data that is truncated relative to the declared point count.
 */
export function parseWkbLineStringHex(hex: string): [number, number][] {
  const bytes = hexToBytes(hex)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (view.byteLength < 5) {
    throw new Error('parseWkbLineStringHex: truncated data (missing byte order/geometry type)')
  }

  let offset = 0
  const byteOrder = view.getUint8(offset)
  offset += 1
  const littleEndian = byteOrder === 1
  if (byteOrder !== 0 && byteOrder !== 1) {
    throw new Error(`parseWkbLineStringHex: unknown byte order byte 0x${byteOrder.toString(16)}`)
  }

  const rawType = view.getUint32(offset, littleEndian)
  offset += 4
  const hasSrid = (rawType & SRID_FLAG) !== 0
  const geometryType = rawType & 0xffff

  if (hasSrid) {
    if (view.byteLength < offset + 4) {
      throw new Error('parseWkbLineStringHex: truncated data (missing SRID)')
    }
    offset += 4 // skip SRID, unused by callers (coordinates are assumed LV95/2056)
  }

  if (geometryType !== WKB_LINESTRING) {
    throw new Error(
      `parseWkbLineStringHex: unsupported geometry type ${geometryType} (only LineString/${WKB_LINESTRING} is supported)`,
    )
  }

  if (view.byteLength < offset + 4) {
    throw new Error('parseWkbLineStringHex: truncated data (missing point count)')
  }
  const pointCount = view.getUint32(offset, littleEndian)
  offset += 4

  const expectedBytes = offset + pointCount * 16
  if (view.byteLength < expectedBytes) {
    throw new Error(
      `parseWkbLineStringHex: truncated data (expected ${expectedBytes} bytes for ${pointCount} points, got ${view.byteLength})`,
    )
  }

  const points: [number, number][] = []
  for (let i = 0; i < pointCount; i++) {
    const x = view.getFloat64(offset, littleEndian)
    offset += 8
    const y = view.getFloat64(offset, littleEndian)
    offset += 8
    points.push([x, y])
  }

  return points
}
