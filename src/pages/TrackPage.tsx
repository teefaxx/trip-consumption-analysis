import { useEffect, useRef, useState } from 'react'
import MapView from '../components/MapView'
import TraceLayer from '../components/TraceLayer'
import TrackingBadge from '../components/TrackingBadge'
import ModePicker from '../components/ModePicker'
import TripSummarySheet from '../components/TripSummarySheet'
import ProfileName, { type ProfileNameHandle } from '../components/ProfileName'
import Banner from '../components/Banner'
import ConfirmDialog from '../components/ConfirmDialog'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTripStore } from '../store/tripStore'
import { TripTooShortError, type ModeId, type Trip } from '../lib'

type ModePickerMode = 'start' | 'switch' | null

function describeGeolocationError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied. Enable it in your browser settings to track a trip.'
    case err.POSITION_UNAVAILABLE:
      return 'Location unavailable right now.'
    case err.TIMEOUT:
      return 'Location request timed out.'
    default:
      return err.message || 'Location error.'
  }
}

export default function TrackPage() {
  const profileName = useTripStore((s) => s.profileName)
  const status = useTripStore((s) => s.status)
  const mode = useTripStore((s) => s.mode)
  const points = useTripStore((s) => s.points)
  const startedAt = useTripStore((s) => s.startedAt)
  const lastPosition = useTripStore((s) => s.lastPosition)
  const error = useTripStore((s) => s.error)
  const setError = useTripStore((s) => s.setError)
  const startTrip = useTripStore((s) => s.startTrip)
  const switchMode = useTripStore((s) => s.switchMode)
  const addPosition = useTripStore((s) => s.addPosition)
  const endTrip = useTripStore((s) => s.endTrip)
  const discardTrip = useTripStore((s) => s.discardTrip)
  const restoreInProgress = useTripStore((s) => s.restoreInProgress)

  const [modePicker, setModePicker] = useState<ModePickerMode>(null)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [tooShort, setTooShort] = useState(false)
  const [summaryTrip, setSummaryTrip] = useState<Trip | null>(null)

  const profileNameRef = useRef<ProfileNameHandle>(null)

  // Resume a trip that survived a reload (fixes legacy bug F1).
  useEffect(() => {
    void restoreInProgress()
  }, [restoreInProgress])

  useGeolocation(
    status === 'tracking',
    (pos) => addPosition(pos),
    (err) => setError(describeGeolocationError(err)),
  )

  const handleStartRequest = () => {
    if (!profileName.trim()) {
      profileNameRef.current?.open()
    }
    setModePicker('start')
  }

  const handlePickStart = (pickedMode: ModeId) => {
    startTrip(pickedMode)
    setModePicker(null)
  }

  const handlePickSwitch = (pickedMode: ModeId) => {
    switchMode(pickedMode)
    setModePicker(null)
  }

  const handleConfirmEnd = async () => {
    setConfirmEndOpen(false)
    try {
      const trip = await endTrip()
      setSummaryTrip(trip)
    } catch (err) {
      if (err instanceof TripTooShortError) {
        setTooShort(true)
      } else {
        setError(err instanceof Error ? err.message : 'Could not end trip.')
      }
    }
  }

  const handleDiscard = () => {
    discardTrip()
    setTooShort(false)
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Trip Consumption</h1>
        <ProfileName ref={profileNameRef} />
      </header>

      <div className="relative min-h-0 flex-1">
        {/* Absolute wrapper: Mapbox needs a definite pixel height, and
            `height: 100%` does not resolve inside a flex item. */}
        <div className="absolute inset-0">
          <MapView>
            <TraceLayer points={points} />
          </MapView>
        </div>

        <TrackingBadge
          status={status}
          mode={mode}
          startedAt={startedAt}
          pointCount={points.length}
          accuracyM={lastPosition?.acc ?? null}
        />

        {error && (
          <div className="absolute inset-x-3 top-3 z-20">
            <Banner tone="error" message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {tooShort && (
          <div className="absolute inset-x-3 top-3 z-20">
            <Banner
              tone="warning"
              message="Trip has fewer than 2 usable points after cleaning — there isn't enough to save."
              actionLabel="Discard trip"
              onAction={handleDiscard}
              onDismiss={() => setTooShort(false)}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white p-4">
        {status === 'idle' ? (
          <button
            type="button"
            onClick={handleStartRequest}
            className="w-full rounded-xl bg-gray-900 py-3.5 text-base font-semibold text-white active:bg-gray-800"
          >
            Start trip
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setModePicker('switch')}
              className="flex-1 rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-900 active:bg-gray-100"
            >
              Switch mode
            </button>
            <button
              type="button"
              onClick={() => setConfirmEndOpen(true)}
              className="flex-1 rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white active:bg-red-700"
            >
              End trip
            </button>
          </div>
        )}
      </div>

      {modePicker && (
        <ModePicker
          title={modePicker === 'start' ? 'Start trip — pick a mode' : 'Switch mode'}
          onPick={modePicker === 'start' ? handlePickStart : handlePickSwitch}
          onClose={() => setModePicker(null)}
        />
      )}

      {confirmEndOpen && (
        <ConfirmDialog
          title="End trip?"
          message="This stops tracking and saves the trip."
          confirmLabel="End trip"
          onConfirm={() => void handleConfirmEnd()}
          onCancel={() => setConfirmEndOpen(false)}
        />
      )}

      {summaryTrip && (
        <TripSummarySheet trip={summaryTrip} onDone={() => setSummaryTrip(null)} />
      )}
    </div>
  )
}
