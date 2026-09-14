const DEFAULT_TZ = 'Europe/Zurich'

interface WallClock {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(tz: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(tz)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatterCache.set(tz, formatter)
  }
  return formatter
}

/** The given time zone's wall-clock reading for a UTC instant. */
function wallClockAt(utcMs: number, tz: string): WallClock {
  const parts = getFormatter(tz).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Treats a wall-clock reading as if it were UTC, for diffing purposes. */
function asUtcMs(w: WallClock): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
}

/**
 * Epoch ms for a Europe/Zurich (or other IANA zone) wall-clock time, with no
 * date library. There is no `Intl` API that goes wall-clock → epoch
 * directly, so this guesses (treating the wall-clock as UTC), reads back
 * what that guess actually looks like in the target zone, and corrects by
 * the difference — repeated once more to settle DST-boundary edge cases
 * (the corrected guess can land close enough to a transition that its own
 * offset differs from the first guess's).
 */
export function zurichLocalToEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string = DEFAULT_TZ,
): number {
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0)

  let guess = desiredUtc
  for (let i = 0; i < 3; i++) {
    const wallAtGuess = asUtcMs(wallClockAt(guess, tz))
    const diff = desiredUtc - wallAtGuess
    if (diff === 0) break
    guess += diff
  }

  return guess
}
