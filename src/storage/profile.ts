const PROFILE_NAME_KEY = 'tca.profileName'

export function getProfileName(): string {
  try {
    return localStorage.getItem(PROFILE_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setProfileName(name: string): void {
  try {
    localStorage.setItem(PROFILE_NAME_KEY, name)
  } catch {
    // Ignore: localStorage unavailable (private mode, SSR, etc).
  }
}
