import { useState } from 'react'
import { useAccountStore } from '../store/accountStore'

/**
 * Shown once after signing in when this device holds trips recorded while
 * signed out: asks before anything leaves the device.
 */
export default function DeviceTripsPrompt() {
  const offer = useAccountStore((s) => s.deviceTripsOffer)
  const addDeviceTrips = useAccountStore((s) => s.addDeviceTrips)
  const dismissDeviceTrips = useAccountStore((s) => s.dismissDeviceTrips)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!offer) return null

  const handleAdd = async () => {
    setBusy(true)
    setError(null)
    try {
      await addDeviceTrips()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the trips.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          Add {offer} trip{offer === 1 ? '' : 's'} from this device?
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          {offer === 1 ? 'This trip was' : 'These trips were'} recorded without an account and
          {offer === 1 ? ' is' : ' are'} only stored on this device. Adding them uploads them to
          your account. You can also do this later from the Account page.
        </p>
        {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={dismissDeviceTrips}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-100 disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAdd()}
            className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white active:bg-gray-800 disabled:opacity-50"
          >
            Add to account
          </button>
        </div>
      </div>
    </div>
  )
}
