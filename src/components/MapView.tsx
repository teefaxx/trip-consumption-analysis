import { useState, type ReactNode } from 'react'
import Map, {
  GeolocateControl,
  NavigationControl,
  type ErrorEvent,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import Banner from './Banner'
import { describeMapError } from '../lib/mapError'

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
 * previewed) without a Mapbox account. Request failures (bad token, URL
 * restriction) are surfaced as a banner because the phone has no DevTools.
 */
export default function MapView({ children, initialViewState }: MapViewProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const [mapError, setMapError] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 p-6 text-center text-sm text-gray-500">
        Map unavailable: set VITE_MAPBOX_TOKEN in .env (see .env.example)
      </div>
    )
  }

  const handleError = (e: ErrorEvent) => {
    // First failure wins: the style request fails first and is the root cause;
    // the tile errors that follow would only replace it with the same story.
    setMapError((current) => current ?? describeMapError(e.error, window.location.origin))
  }

  return (
    <div className="relative h-full w-full">
      <Map
        mapboxAccessToken={token}
        initialViewState={{ ...DEFAULT_VIEW_STATE, ...initialViewState }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        reuseMaps
        style={{ width: '100%', height: '100%' }}
        onError={handleError}
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
      {mapError && (
        <div className="absolute inset-x-3 bottom-12 z-20">
          <Banner tone="error" message={mapError} onDismiss={() => setMapError(null)} />
        </div>
      )}
    </div>
  )
}
