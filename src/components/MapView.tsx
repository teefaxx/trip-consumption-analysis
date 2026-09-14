import type { ReactNode } from 'react'
import Map, { GeolocateControl, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

export interface MapViewInitialViewState {
  longitude?: number
  latitude?: number
  zoom?: number
}

interface MapViewProps {
  children?: ReactNode
  initialViewState?: MapViewInitialViewState
}

/** Zurich, roughly the city centre. */
const DEFAULT_VIEW_STATE: Required<MapViewInitialViewState> = {
  longitude: 8.5417,
  latitude: 47.3769,
  zoom: 12,
}

/**
 * Wraps react-map-gl's `<Map>` with the app's default style, controls and
 * token handling. If `VITE_MAPBOX_TOKEN` is not set, renders a placeholder
 * instead of mounting the map, so the app still runs (and can be built and
 * previewed) without a Mapbox account.
 */
export default function MapView({ children, initialViewState }: MapViewProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 p-6 text-center text-sm text-gray-500">
        Map unavailable: set VITE_MAPBOX_TOKEN in .env (see .env.example)
      </div>
    )
  }

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{ ...DEFAULT_VIEW_STATE, ...initialViewState }}
      mapStyle="mapbox://styles/mapbox/standard"
      reuseMaps
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <GeolocateControl
        position="top-right"
        trackUserLocation
        showUserHeading
        positionOptions={{ enableHighAccuracy: true }}
      />
      {children}
    </Map>
  )
}
