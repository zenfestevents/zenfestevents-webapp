// Client-safe calendar maths for yearly occasions. Everything works on the
// India (Asia/Kolkata) calendar date: Payload stores dates as UTC timestamps, and
// a "9 Oct" picked in an Indian browser is saved as 8 Oct 18:30 UTC — reading it
// in UTC would move every occasion a day early.

export const OCCASION_TZ = 'Asia/Kolkata'

/** A calendar date; `m` is 1–12. */
export type Ymd = { y: number; m: number; d: number }

const istParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: OCCASION_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The India calendar date of a timestamp, or null for a missing/invalid date. */
export function istYmd(input: string | Date | null | undefined): Ymd | null {
  if (!input) return null
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  const get = (type: string) => Number(istParts.formatToParts(date).find((p) => p.type === type)?.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

export function todayIst(now: Date = new Date()): Ymd {
  return istYmd(now) as Ymd
}

export function ymdKey({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "2026-10-09" → Ymd (null if malformed or not a real date). */
export function parseYmdKey(key: string | null | undefined): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '')
  if (!match) return null
  const ymd = { y: +match[1], m: +match[2], d: +match[3] }
  return isRealDate(ymd) ? ymd : null
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function isRealDate({ y, m, d }: Ymd): boolean {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

const dayNumber = ({ y, m, d }: Ymd) => Date.UTC(y, m - 1, d) / 86_400_000

/** Whole days from `a` to `b` (negative if `b` is earlier). */
export function daysBetween(a: Ymd, b: Ymd): number {
  return dayNumber(b) - dayNumber(a)
}

export function addDays(ymd: Ymd, days: number): Ymd {
  const t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + days))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** The occasion's date in `year`; 29 Feb falls on 28 Feb in non-leap years. */
export function occurrenceIn(original: Ymd, year: number): Ymd {
  const d = original.m === 2 && original.d === 29 && !isLeapYear(year) ? 28 : original.d
  return { y: year, m: original.m, d }
}

/**
 * The next time the occasion comes round, today included. With a known year,
 * only real anniversaries count (strictly after the original date), so an
 * enquiry for a wedding next month gives its 1st anniversary, not "0th".
 * `nth` is the number of years since the original (null when the year is unknown).
 */
export function nextOccurrence(original: Ymd, today: Ymd, yearKnown: boolean): { date: Ymd; nth: number | null } {
  let year = today.y
  if (daysBetween(today, occurrenceIn(original, year)) < 0) year += 1
  if (yearKnown && year <= original.y) year = original.y + 1
  return { date: occurrenceIn(original, year), nth: yearKnown ? year - original.y : null }
}

/**
 * Timestamp to store for a calendar date: noon in India, so it reads as the same
 * day in any timezone from UTC−6 to UTC+12 (and in the admin's date pickers).
 */
export function ymdToIso(ymd: Ymd): string {
  return new Date(`${ymdKey(ymd)}T12:00:00+05:30`).toISOString()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Fri, 9 Oct" — the form used in messages. */
export function formatDay(ymd: Ymd): string {
  const weekday = WEEKDAYS[new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay()]
  return `${weekday}, ${ymd.d} ${MONTHS[ymd.m - 1]}`
}

/** "9 Oct 2026". */
export function formatFull(ymd: Ymd): string {
  return `${ymd.d} ${MONTHS[ymd.m - 1]} ${ymd.y}`
}

/** "today", "tomorrow", "in 5 days", "2 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

/**
 * Parses the dates people type in sheets: "09-10-2026", "9/10/2026", "2026-10-09",
 * "9 Oct 2026", and year-less "09-10" / "9 Oct" (day first, Indian style).
 * Year-less dates come back with year 2000 (a leap year, so 29 Feb survives).
 */
export function parseLooseDate(input: string): { ymd: Ymd; yearKnown: boolean } | null {
  const s = input.trim()
  let y: number | undefined
  let m: number | undefined
  let d: number | undefined
  let match: RegExpExecArray | null
  if ((match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) {
    ;[y, m, d] = [+match[1], +match[2], +match[3]]
  } else if ((match = /^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2}|\d{4}))?$/.exec(s))) {
    ;[d, m] = [+match[1], +match[2]]
    if (match[3]) y = match[3].length === 2 ? 2000 + +match[3] : +match[3]
  } else if ((match = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,})\.?,?(?:[\s-]+(\d{4}))?$/i.exec(s))) {
    d = +match[1]
    m = MONTHS.findIndex((name) => match![2].toLowerCase().startsWith(name.toLowerCase())) + 1
    if (match[3]) y = +match[3]
  }
  if (!d || !m) return null
  const ymd = { y: y ?? 2000, m, d }
  return isRealDate(ymd) ? { ymd, yearKnown: y !== undefined } : null
}
