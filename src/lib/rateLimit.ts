// Server-only, best-effort per-IP rate limit for Server Actions. In memory, so it
// is per serverless instance: enough to stop a script hammering one action, not
// a security boundary.
import { headers } from 'next/headers'

const hits = new Map<string, number[]>()

export async function clientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
}

/** Records a hit and returns true when `bucket` has seen more than `max` in `windowMs`. */
export async function rateLimited(bucket: string, max: number, windowMs: number): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > max
}
