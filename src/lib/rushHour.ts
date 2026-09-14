/**
 * Whether the given instant falls inside the morning (07:00-10:00) or
 * evening (16:30-19:30) rush-hour windows, evaluated in the given IANA time
 * zone's wall-clock time (default Europe/Zurich).
 *
 * The legacy app compared UTC timestamps against these windows (bug C2) and
 * used `time > 07:00 OR time < 10:00`, which is a tautology (bug C1). Both
 * are fixed here: we convert to local wall-clock minutes-of-day first, and
 * use proper half-open interval checks.
 */
export function isRushHour(t: number, tz = 'Europe/Zurich'): boolean {
  const minutes = minutesOfDay(t, tz)
  const morning = minutes >= 7 * 60 && minutes < 10 * 60
  const evening = minutes >= 16 * 60 + 30 && minutes < 19 * 60 + 30
  return morning || evening
}

function minutesOfDay(t: number, tz: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  })
  const parts = formatter.formatToParts(new Date(t))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}
