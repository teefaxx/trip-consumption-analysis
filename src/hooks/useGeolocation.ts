import { useEffect, useRef } from 'react'

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
}

function unsupportedError(): GeolocationPositionError {
  return {
    code: 2,
    message: 'Geolocation is not supported by this browser.',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  }
}

/**
 * Tracks the device's position while `active` is true: exactly one
 * `navigator.geolocation.watchPosition` call, cleared with `clearWatch` on
 * cleanup and whenever `active` flips back to false (fixes legacy bug C6,
 * where Start/Switch registered a new watcher without clearing the last
 * one). Also requests a screen wake lock while active so tracking survives
 * the screen dimming, re-requesting it whenever the tab becomes visible
 * again (a wake lock is released automatically when a tab is hidden).
 *
 * `onPosition`/`onError` are read from refs on every fix so the effect only
 * re-subscribes when `active` itself changes, not on every render.
 */
export function useGeolocation(
  active: boolean,
  onPosition: (pos: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError) => void,
): void {
  const onPositionRef = useRef(onPosition)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onPositionRef.current = onPosition
    onErrorRef.current = onError
  }, [onPosition, onError])

  useEffect(() => {
    if (!active) return

    if (!navigator.geolocation) {
      onErrorRef.current(unsupportedError())
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => onPositionRef.current(pos),
      (err) => onErrorRef.current(err),
      GEOLOCATION_OPTIONS,
    )

    let wakeLock: WakeLockSentinel | null = null

    const requestWakeLock = async () => {
      try {
        wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        // Wake lock unavailable or denied — tracking still works, the
        // screen may just dim/lock on its own.
      }
    }
    void requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      try {
        void wakeLock?.release()
      } catch {
        // Ignore release errors.
      }
      wakeLock = null
    }
  }, [active])
}
