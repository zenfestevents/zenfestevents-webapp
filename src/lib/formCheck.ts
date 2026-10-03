// Small input validators for Server Actions (account, vendor dashboard,
// marketplace). Client-safe: no server imports.

export const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const oneOf = <T extends readonly (readonly [string, ...string[]])[]>(list: T, v: unknown) =>
  list.some(([value]) => value === v) ? (v as T[number][0]) : undefined

/** A whole number in [min, max], or null. */
export const int = (v: unknown, min = 0, max = 1_00_00_00_000) => {
  if (v === '' || v == null) return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200

/** "YYYY-MM-DD" → Date at noon India time (so the day never shifts), or null. */
export function dayToDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T12:00:00+05:30`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Business name → URL slug ("Sri Lakshmi Studios" → "sri-lakshmi-studios"). */
export function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '')
}

/** An error whose message is safe to show the user (anything else shows a generic line). */
export class UserError extends Error {}

export const fail = (err: unknown): { ok: false; error: string } => {
  if (!(err instanceof UserError)) console.error('[action]', err)
  return {
    ok: false,
    error: err instanceof UserError ? err.message : 'Something went wrong. Please try again.',
  }
}
