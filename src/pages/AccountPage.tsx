import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Banner from '../components/Banner'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAccountStore } from '../store/accountStore'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

const buttonClass =
  'w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-900 active:bg-gray-100 disabled:opacity-50'

function timeAgo(t: number): string {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return new Date(t).toLocaleString()
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

type Dialog = 'signOutPending' | 'deleteAccount' | 'removeSamples' | null

export default function AccountPage() {
  const navigate = useNavigate()
  const configured = useAccountStore((s) => s.configured)
  const ready = useAccountStore((s) => s.ready)
  const account = useAccountStore((s) => s.account)
  const syncing = useAccountStore((s) => s.syncing)
  const lastSyncedAt = useAccountStore((s) => s.lastSyncedAt)
  const syncError = useAccountStore((s) => s.syncError)
  const pending = useAccountStore((s) => s.pending)
  const authError = useAccountStore((s) => s.authError)
  const dataVersion = useAccountStore((s) => s.dataVersion)
  const {
    signIn,
    signOut,
    deleteAccount,
    syncNow,
    addSampleTrips,
    removeSampleTrips,
    addDeviceTrips,
    countDeviceTrips,
  } = useAccountStore.getState()

  const [dialog, setDialog] = useState<Dialog>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [deviceTrips, setDeviceTrips] = useState(0)

  useEffect(() => {
    if (!account) return
    let cancelled = false
    void countDeviceTrips().then((n) => {
      if (!cancelled) setDeviceTrips(n)
    })
    return () => {
      cancelled = true
    }
  }, [account, countDeviceTrips, dataVersion])

  const run = async (fn: () => Promise<string | null | void>) => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const message = await fn()
      if (message) setStatus(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = (force: boolean) =>
    run(async () => {
      setDialog(null)
      const result = await signOut({ force })
      if (!result.ok) {
        setDialog('signOutPending')
        return
      }
      navigate('/')
    })

  let body: ReactNode
  if (!configured) {
    body = (
      <Card title="Accounts are not set up">
        <p className="text-sm text-gray-600">
          This build has no cloud database configured, so your trips stay on this device. Use
          Export / Import on the History page to back them up.
        </p>
      </Card>
    )
  } else if (!ready) {
    body = <p className="text-sm text-gray-500">Loading…</p>
  } else if (!account) {
    body = (
      <>
        <Card title="Sign in">
          <p className="text-sm text-gray-600">
            Sign in with GitHub to keep your trips in your account and see them on all your
            devices. A new account starts with a few sample trips so you can explore the History
            page.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(signIn)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white active:bg-gray-800 disabled:opacity-50"
          >
            <GitHubMark />
            Continue with GitHub
          </button>
        </Card>
        <Card title="What is stored">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
            <li>
              Without an account, nothing leaves this device (apart from map tile requests).
            </li>
            <li>
              With an account, your trips — including their GPS traces — are stored in the
              app&rsquo;s database. Only you can read them; access is enforced by the database
              itself.
            </li>
            <li>From GitHub the app only uses your name, username and email for sign-in.</li>
            <li>You can delete your account and all its trips at any time.</li>
          </ul>
        </Card>
      </>
    )
  } else {
    body = (
      <>
        <Card title="Signed in">
          <div className="flex items-center gap-3">
            <GitHubMark />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">{account.name}</div>
              {account.login && (
                <div className="truncate text-xs text-gray-500">@{account.login}</div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500">New trips are saved under this name.</p>
        </Card>

        <Card title="Sync">
          <div className="text-sm text-gray-600">
            {syncing
              ? 'Syncing…'
              : pending > 0
                ? `${pending} change${pending === 1 ? '' : 's'} waiting to upload.`
                : lastSyncedAt
                  ? `Up to date · synced ${timeAgo(lastSyncedAt)}.`
                  : 'Not synced yet.'}
          </div>
          {syncError && (
            <Banner
              tone="warning"
              message={syncError}
              onDismiss={() => useAccountStore.setState({ syncError: null })}
            />
          )}
          <button
            type="button"
            disabled={busy || syncing}
            onClick={() => void run(syncNow)}
            className={buttonClass}
          >
            Sync now
          </button>
        </Card>

        <Card title="Trips">
          {deviceTrips > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const n = await addDeviceTrips()
                  return `Added ${n} trip${n === 1 ? '' : 's'} from this device.`
                })
              }
              className={buttonClass}
            >
              Add {deviceTrips} trip{deviceTrips === 1 ? '' : 's'} recorded on this device
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await addSampleTrips()
                return 'Sample trips added — see yesterday and the day before on History.'
              })
            }
            className={buttonClass}
          >
            Add sample trips
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDialog('removeSamples')}
            className={buttonClass}
          >
            Remove sample trips
          </button>
        </Card>

        <Card title="Account">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignOut(false)}
            className={buttonClass}
          >
            Sign out
          </button>
          <p className="text-xs text-gray-500">
            Signing out removes this account&rsquo;s trips from this device. They stay in your
            account.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDialog('deleteAccount')}
            className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-700 active:bg-red-50 disabled:opacity-50"
          >
            Delete account and all trips
          </button>
        </Card>
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Account</h1>
      </header>

      <div className="flex flex-col gap-3 p-4 pb-10">
        {authError && (
          <Banner
            tone="error"
            message={`Sign-in failed: ${authError}`}
            onDismiss={() => useAccountStore.setState({ authError: null })}
          />
        )}
        {error && <Banner tone="error" message={error} onDismiss={() => setError(null)} />}
        {status && !error && (
          <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">{status}</div>
        )}
        {body}
      </div>

      {dialog === 'signOutPending' && (
        <ConfirmDialog
          title="Sign out anyway?"
          message={`${pending} change${pending === 1 ? ' has' : 's have'} not been uploaded yet (are you offline?). Signing out now loses ${pending === 1 ? 'it' : 'them'}.`}
          confirmLabel="Sign out"
          onConfirm={() => void handleSignOut(true)}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'removeSamples' && (
        <ConfirmDialog
          title="Remove sample trips?"
          message="Removes the generated sample trips from your account. Your own trips are not affected."
          confirmLabel="Remove"
          onConfirm={() =>
            void run(async () => {
              setDialog(null)
              const n = await removeSampleTrips()
              return `Removed ${n} sample trip${n === 1 ? '' : 's'}.`
            })
          }
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'deleteAccount' && (
        <ConfirmDialog
          title="Delete account?"
          message="This permanently deletes your account and every trip stored in it, on the server and on this device. This cannot be undone — export your trips first if you want a copy."
          confirmLabel="Delete forever"
          onConfirm={() =>
            void run(async () => {
              setDialog(null)
              await deleteAccount()
              navigate('/')
            })
          }
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
