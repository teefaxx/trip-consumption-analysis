import { forwardRef, useImperativeHandle, useState } from 'react'
import { useTripStore } from '../store/tripStore'

export interface ProfileNameHandle {
  /** Opens the inline editor — used by TrackPage to nudge for a name. */
  open: () => void
}

/**
 * The profile name shown in the top bar. Tapping it opens a small inline
 * input; the name is saved (to the store, which persists it) on blur or
 * Enter. Replaces the legacy 4-user dropdown with one free-text name.
 */
const ProfileName = forwardRef<ProfileNameHandle>(function ProfileName(_props, ref) {
  const profileName = useTripStore((s) => s.profileName)
  const setProfileName = useTripStore((s) => s.setProfileName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profileName)

  useImperativeHandle(ref, () => ({
    open: () => {
      setDraft(profileName)
      setEditing(true)
    },
  }))

  const commit = () => {
    setProfileName(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        placeholder="Your name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
          } else if (e.key === 'Escape') {
            setDraft(profileName)
            setEditing(false)
          }
        }}
        className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-500"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(profileName)
        setEditing(true)
      }}
      className="rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200"
    >
      {profileName || 'Set your name'}
    </button>
  )
})

export default ProfileName
