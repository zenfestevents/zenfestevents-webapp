// Server-only: a short-lived cache for the content public pages read on every visit
// (site settings, homepage projects / services, testimonials). Each read hit Neon on
// every request, which made the homepage 1.3–2.6 s slow to start (2026-10-22). Entries
// expire after REVALIDATE seconds as a safety net; saving in /admin clears them at once
// through hooks/revalidateContent.ts. Never cache anything that reads cookies.
import { unstable_cache } from 'next/cache'

export const CONTENT_TAGS = {
  settings: 'content:site-settings',
  projects: 'content:projects',
  services: 'content:services',
  testimonials: 'content:testimonials',
} as const

export type ContentTag = (typeof CONTENT_TAGS)[keyof typeof CONTENT_TAGS]

const REVALIDATE = 300

/**
 * Cache `fn` under `key` until one of `tags` is cleared. `fn` should throw on a
 * database error rather than return a fallback, so a failure is never cached.
 */
export function cachedContent<T>(fn: () => Promise<T>, key: string, tags: ContentTag[]) {
  return unstable_cache(fn, ['zf-content', key], { tags, revalidate: REVALIDATE })
}
