import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/mapbox'
import type { ExpressionSpecification } from 'mapbox-gl'
import { buildTraceFeatureCollection, modeColorExpression } from '../lib'
import type { Trackpoint } from '../lib'

interface TraceLayerProps {
  points: readonly Trackpoint[]
}

const LINE_COLOR = modeColorExpression() as unknown as ExpressionSpecification

/**
 * Live trip trace: a GeoJSON source rebuilt from the raw recorded points
 * (react-map-gl diffs it into the map with `setData`, no full re-render),
 * rendered as one line coloured per mode.
 */
export default function TraceLayer({ points }: TraceLayerProps) {
  const data = useMemo(() => buildTraceFeatureCollection(points), [points])

  return (
    <Source id="trace" type="geojson" data={data}>
      <Layer
        id="trace-line"
        type="line"
        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
        paint={{
          'line-color': LINE_COLOR,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 5],
        }}
      />
    </Source>
  )
}
