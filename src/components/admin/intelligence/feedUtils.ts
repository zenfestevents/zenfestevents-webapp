// Client-safe helpers for the Intelligence Hub admin pages (no server imports here).

export function timeAgo(value: string | null): string {
  if (!value) return 'never'
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

const IST = 'Asia/Kolkata'
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: IST })

/** "Today", "Yesterday" or "Mon, 16 Nov" (India dates). */
export function dayLabel(value: string | null): string {
  if (!value) return 'Undated'
  const d = new Date(value)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (dayKey(d) === dayKey(today)) return 'Today'
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' })
}

/** Links and pictures come from outside sources: allow only http(s). */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
