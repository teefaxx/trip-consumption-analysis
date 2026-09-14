/**
 * Turn a Mapbox GL error into a message that says what to fix. Mapbox
 * reports request failures as `AJAXError` (carries `status` and `url`); a
 * rejected token is otherwise invisible — the map just stays grey.
 */
export function describeMapError(
  err: { message: string; status?: number; url?: string },
  origin: string,
): string {
  const where = endpointOf(err.url)
  switch (err.status) {
    case 401:
      return `Mapbox rejected the access token (401) for ${where}. The token in the build is wrong or expired: check the MAPBOX_TOKEN secret (or VITE_MAPBOX_TOKEN in .env) and redeploy.`
    case 403:
      return `Mapbox refused ${where} (403). If the map is blank, add this origin to the token's URL restrictions: ${origin}`
    case 429:
      return `Mapbox rate limit reached (429) for ${where}. Try again later.`
    default:
      return `Map error: ${err.message}`
  }
}

/** Host and path of a request URL, without the query string (which carries the token). */
function endpointOf(url: string | undefined): string {
  if (!url) return 'a request'
  try {
    const u = new URL(url)
    return u.host + u.pathname
  } catch {
    return 'a request'
  }
}
