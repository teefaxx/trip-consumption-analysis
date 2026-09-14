interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * In-app confirmation modal (no `window.confirm`, which is jarring on
 * mobile and can't be styled). Shared by TrackPage ("End trip?") and
 * HistoryPage ("Delete trip?").
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-900">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white active:bg-gray-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
