// Server-only: published testimonials for the public pages. Like lib/registry.ts this is
// the boundary — pages get `PublicTestimonial`s (short name, no raw Payload docs).
import { CONTENT_TAGS, cachedContent } from './contentCache'
import { getPayloadClient } from './payload'
import { testimonialEventLabel } from './testimonialOptions'

export type PublicTestimonial = {
  id: number | string
  /** "Priya R." — first name and an initial, never the full name. */
  name: string
  rating: number
  text: string
  event: string
  source: 'google' | 'direct'
  featured: boolean
}

/** "jeya prakash" → "Jeya P.", "THIRAVIDAN.E" → "THIRAVIDAN.E". */
export function shortName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'A client'
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return parts.length === 1 ? cap(parts[0]) : `${cap(parts[0])} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

const readAll = cachedContent(
  async () => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'testimonials',
      where: { published: { equals: true } },
      depth: 0,
      limit: 500,
      pagination: false,
      sort: '-date',
    })
    return res.docs.map(
      (d): PublicTestimonial => ({
        id: d.id,
        name: shortName(d.name),
        rating: d.rating,
        text: d.text,
        event: testimonialEventLabel(d.eventType),
        source: d.source === 'google' ? 'google' : 'direct',
        featured: Boolean(d.featured),
      }),
    )
  },
  'testimonials',
  [CONTENT_TAGS.testimonials],
)

/** Every published testimonial, newest first; empty if the database is down. */
export async function listTestimonials(): Promise<PublicTestimonial[]> {
  try {
    return await readAll()
  } catch {
    return []
  }
}

/** Up to three for the homepage: featured ones first, then the newest five-star reviews. */
export async function homeTestimonials() {
  const all = await listTestimonials()
  const featured = all.filter((t) => t.featured)
  const rest = all.filter((t) => !t.featured && t.rating === 5)
  return [...featured, ...rest].slice(0, 3)
}

/** Whether to show Testimonials in the menu and footer. */
export async function hasTestimonials() {
  return (await listTestimonials()).length > 0
}
