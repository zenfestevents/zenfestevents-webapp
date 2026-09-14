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

/** Pick the best available URL for a media doc, preferring a named size. */
export function mediaUrl(media: MediaDoc, size?: string): string {
  if (!media || typeof media === 'string') return ''
  if (size && media.sizes?.[size]?.url) return media.sizes[size]!.url as string
  return media.url || ''
}

export function mediaAlt(media: MediaDoc, fallback = ''): string {
  if (!media || typeof media === 'string') return fallback
  return media.alt || fallback
}
