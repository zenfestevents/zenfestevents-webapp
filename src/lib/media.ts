/** Loosely-typed media doc from Payload (populated upload). */
export type MediaDoc =
  | {
      url?: string
      alt?: string
      width?: number
      height?: number
      sizes?: Record<string, { url?: string; width?: number; height?: number }>
    }
  | string
  | null
  | undefined

/**
 * Payload prefixes locally-stored media with its serverURL (`http://localhost:3000`
 * in dev), which breaks on any other host — e.g. a phone testing the dev server over
 * Wi-Fi, where "localhost" is the phone. Serve our own /api/media URLs root-relative;
 * external URLs (Vercel Blob) pass through untouched.
 */
function relativeIfOwnMedia(url: string): string {
  return url.replace(/^https?:\/\/[^/]+(?=\/api\/media\/)/, '')
}

/** Pick the best available URL for a media doc, preferring a named size. */
export function mediaUrl(media: MediaDoc, size?: string): string {
  if (!media || typeof media === 'string') return ''
  if (size && media.sizes?.[size]?.url) return relativeIfOwnMedia(media.sizes[size]!.url as string)
  return relativeIfOwnMedia(media.url || '')
}

export function mediaAlt(media: MediaDoc, fallback = ''): string {
  if (!media || typeof media === 'string') return fallback
  return media.alt || fallback
}
