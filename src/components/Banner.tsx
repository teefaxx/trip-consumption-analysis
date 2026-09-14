interface BannerProps {
  tone?: 'error' | 'warning'
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
}

/**
 * Dismissible inline alert, absolutely positioned over its container (the
 * map area on TrackPage/HistoryPage) or usable in normal flow. Shared by
 * both pages so their error/warning styling stays identical.
 */
export default function Banner({
  tone = 'error',
  message,
  actionLabel,
  onAction,
  onDismiss,
}: BannerProps) {
  const toneClasses =
    tone === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-amber-50 text-amber-800 border-amber-200'

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm shadow ${toneClasses}`}
    >
      <p className="flex-1">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold underline"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md px-1 text-xs font-semibold opacity-70"
      >
        &#10005;
      </button>
    </div>
  )
}
