/** Local (given time zone) calendar date of an epoch-ms instant, as 'YYYY-MM-DD'. */
export function localDate(t: number, tz = 'Europe/Zurich'): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date(t))
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

/**
 * Steps a 'YYYY-MM-DD' calendar date by `delta` days, returning the result
 * as the same kind of string (evaluated in `tz`). Anchors on noon UTC of
 * the given date before adding whole days: since `tz`'s UTC offset is
 * always well under 12 h, noon UTC can never land on the wrong local
 * calendar day, so this is safe across DST transitions with no date
 * library involved.
 */
export function addDaysIso(dateISO: string, delta: number, tz = 'Europe/Zurich'): string {
  const [year, month, day] = dateISO.split('-').map(Number)
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0)
  return localDate(noonUtc + delta * 86_400_000, tz)
}
