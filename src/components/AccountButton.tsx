import { Link } from 'react-router'
import { useAccountStore } from '../store/accountStore'

/**
 * Top-bar account entry: the account name when signed in, "Sign in"
 * otherwise. Either way it opens the Account page. Hidden in builds without
 * a Supabase project (the app is then local-only).
 */
export default function AccountButton() {
  const configured = useAccountStore((s) => s.configured)
  const ready = useAccountStore((s) => s.ready)
  const account = useAccountStore((s) => s.account)
  const pending = useAccountStore((s) => s.pending)

  if (!configured || !ready) return null

  return (
    <Link
      to="/account"
      className="flex max-w-[55%] items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200"
    >
      <span className="truncate">{account ? account.name : 'Sign in'}</span>
      {account && pending > 0 && (
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
          aria-label={`${pending} change${pending === 1 ? '' : 's'} not uploaded yet`}
        />
      )}
    </Link>
  )
}
