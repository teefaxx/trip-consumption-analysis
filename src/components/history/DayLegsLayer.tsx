import { useEffect, useMemo } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/mapbox'
import bbox from '@turf/bbox'
import type { ExpressionSpecification } from 'mapbox-gl'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { modeColorExpression } from '../../lib'
import type { Trip } from '../../lib'

interface DayLegFeatureProperties {
  mode: number
  tripId: string
  legIndex: number
}

type DayLegsFeatureCollection = FeatureCollection<LineString, DayLegFeatureProperties>

interface DayLegsLayerProps {
  trips: Trip[]
}

const LINE_COLOR = modeColorExpression() as unknown as ExpressionSpecification

function buildFeatureCollection(trips: Trip[]): DayLegsFeatureCollection {
  const features: Feature<LineString, DayLegFeatureProperties>[] = []
  for (const trip of trips) {
    trip.legs.forEach((leg, legIndex) => {
      features.push({
        type: 'Feature',
        properties: { mode: leg.mode, tripId: trip.id, legIndex },
        geometry: leg.geometry,
      })
    })
  }
  return { type: 'FeatureCollection', features }
}

/**
 * One GeoJSON source (data swapped per query, fixing legacy bug F3 by
 * construction) showing every leg of the selected day, coloured by mode.
 * Fits the map to the day's bounding box whenever the data changes and has
 * at least one feature; an empty day leaves the map where it is.
 */
export default function DayLegsLayer({ trips }: DayLegsLayerProps) {
  const { current: map } = useMap()
  const data = useMemo(() => buildFeatureCollection(trips), [trips])

  useEffect(() => {
    if (!map) return
    if (data.features.length === 0) return

    const fit = () => {
      const [minX, minY, maxX, maxY] = bbox(data)
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        { padding: 40, duration: 500, maxZoom: 15 },
      )
    }

    // The map may not have finished loading its style yet (e.g. right after
    // mount), in which case fitBounds before `load` can be dropped — wait
    // for it in that case rather than racing it.
    if (map.loaded()) {
      fit()
      return
    }
    map.once('load', fit)
    return () => {
      map.off('load', fit)
    }
  }, [map, data])

  return (
    <Source id="day-legs" type="geojson" data={data}>
      <Layer
        id="day-legs-line"
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
