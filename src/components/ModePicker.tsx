import { MODE_LIST } from '../lib'
import type { ModeId } from '../lib'

interface ModePickerProps {
  title: string
  onPick: (mode: ModeId) => void
  onClose: () => void
}

/**
 * Bottom-sheet mode selector. One component driven by `MODE_LIST`, used for
 * both "start trip" and "switch mode" — replaces the legacy app's twelve
 * copy-pasted click handlers (and with them, the swapped tram/bus ids).
 */
export default function ModePicker({ title, onPick, onClose }: ModePickerProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 active:bg-gray-200"
          >
            &#10005;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MODE_LIST.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onPick(mode.id)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-4 text-left text-base font-medium text-gray-900 active:bg-gray-100"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: mode.color }}
              />
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
