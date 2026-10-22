import type { Payload, PayloadRequest } from 'payload'

import type { TestimonialEvent } from '../lib/testimonialOptions'
import { GOOGLE_REVIEWS } from './googleReviews'

/**
 * The Google Business listing's reviews (main listing, Guduvancheri), read from Google on
 * 2026-10-22 — 117 reviews, 97 with text — into `testimonials`, word for word. Used by
 * `npm run import:reviews` (local) and a data migration (production). Safe to re-run:
 * a review already imported (same name and text) is skipped.
 * - 4–5 stars are published; 1–3 stars are imported unpublished for the owner to decide.
 * - Google only gives relative dates ("2 months ago"), so `date` is approximate.
 * - The event label is set only when the review clearly names one kind of event.
 */
const READ_ON = Date.UTC(2026, 9, 22, 6, 30) // 2026-10-22, noon IST

type GoogleReview = { name: string; date: string; rating: number; text: string; services: string }

const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30.4, year: 365.25 }

/** "Edited 2 years ago" / "a month ago" → an approximate ISO date. */
function approxDate(rel: string) {
  const m = rel.match(/(a|an|\d+)\s+(day|week|month|year)s?\s+ago/i)
  if (!m) return new Date(READ_ON).toISOString()
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1
  return new Date(READ_ON - n * UNIT_DAYS[m[2].toLowerCase()] * 86_400_000).toISOString()
}

const EVENT_WORDS: [TestimonialEvent, RegExp][] = [
  ['babyshower', /baby\s?shower|valai\s?kaa?ppu|seemantham/i],
  ['birthday', /birth\s?day|b'?day/i],
  ['engagement', /engagement|nichayathartham/i],
  ['wedding', /wedding|marriage|reception/i],
  ['puberty', /puberty|manjal neerattu/i],
  ['housewarming', /house\s?warming|griha/i],
  ['corporate', /corporate|office/i],
  ['opening', /opening|grand launch|launch event|inauguration/i],
  ['sports', /tournament|badminton|cricket/i],
]

function eventOf(r: GoogleReview): TestimonialEvent | undefined {
  const hits = EVENT_WORDS.filter(([, re]) => re.test(`${r.text} ${r.services}`)).map(([k]) => k)
  return hits.length === 1 ? hits[0] : undefined
}

export async function importGoogleReviews(payload: Payload, req?: PayloadRequest) {
  const list = (GOOGLE_REVIEWS as GoogleReview[]).filter((r) => r.text.trim())
  const existing = await payload.find({
    collection: 'testimonials',
    where: { source: { equals: 'google' } },
    limit: 1000,
    pagination: false,
    depth: 0,
    req,
  })
  const seen = new Set(existing.docs.map((d) => `${d.name}\n${d.text}`))
  // Homepage picks on a fresh import: the three newest five-star reviews of a readable length.
  const featured = existing.docs.length
    ? new Set<GoogleReview>()
    : new Set(
        [...list]
          .filter((r) => r.rating === 5 && r.text.length >= 180 && r.text.length <= 600)
          .sort((a, b) => approxDate(b.date).localeCompare(approxDate(a.date)))
          .slice(0, 3),
      )

  let created = 0
  for (const r of list) {
    if (seen.has(`${r.name}\n${r.text}`)) continue
    await payload.create({
      collection: 'testimonials',
      data: {
        name: r.name,
        rating: r.rating,
        text: r.text,
        eventType: eventOf(r),
        date: approxDate(r.date),
        source: 'google',
        published: r.rating >= 4,
        featured: featured.has(r),
      },
      req,
    })
    created++
  }
  return { created, skipped: list.length - created }
}
