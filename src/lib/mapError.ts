/**
 * Turn a Mapbox GL error into a message that says what to fix. Mapbox
 * reports request failures as `AJAXError` (carries `status`); a rejected
 * token is otherwise invisible — the map just stays grey.
 */
export function describeMapError(err: { message: string; status?: number }, origin: string): string {
  switch (err.status) {
    case 401:
      return 'Mapbox rejected the access token (401). The token in the build is wrong or expired: check the MAPBOX_TOKEN secret (or VITE_MAPBOX_TOKEN in .env) and redeploy.'
    case 403:
      return `Mapbox refused requests from this site (403). Add this origin to the token's URL restrictions: ${origin}`
    case 429:
      return 'Mapbox rate limit reached (429). Try again later.'
    default:
      return `Map error: ${err.message}`
  }
}
