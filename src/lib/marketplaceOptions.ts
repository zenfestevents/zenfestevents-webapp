// Option lists for the vendor marketplace, shared by client forms, collections
// and Server Actions. Keep this file free of server imports (see CLAUDE.md).
// The select lists become Postgres enums: changing them needs `migrate:create`.

import { CHENNAI_AREAS } from './vendorOptions'

/** Marketplace categories, as [value, label, one-line description]. */
export const MARKET_CATEGORIES = [
  ['photography', 'Photography & Video', 'Candid, traditional, drone and films'],
  ['makeup', 'Bridal Makeup', 'Bridal and family makeup, hair and draping'],
  ['mehendi', 'Mehendi', 'Bridal and guest mehendi artists'],
  ['decoration', 'Decoration', 'Stage, mandap, flowers and lighting'],
  ['catering', 'Catering', 'Wedding feasts, live counters and banana-leaf meals'],
  ['cake', 'Cakes & Bakes', 'Wedding, birthday and theme cakes'],
  ['venue', 'Venues & Halls', 'Marriage halls, lawns and banquet halls'],
  ['dj', 'DJ & Music', 'DJs, nadaswaram, live bands and sound'],
  ['invitations', 'Invitations', 'Printed and digital invites'],
  ['other', 'Other services', 'Everything else for the big day'],
] as const

export type MarketCategory = (typeof MARKET_CATEGORIES)[number][0]

export const CATEGORY_OPTIONS = MARKET_CATEGORIES.map(([value, label]) => ({ value, label }))

export function categoryLabel(value: unknown) {
  return MARKET_CATEGORIES.find(([v]) => v === value)?.[1] ?? 'Vendor'
}

export function isCategory(value: unknown): value is MarketCategory {
  return MARKET_CATEGORIES.some(([v]) => v === value)
}

/**
 * The vendor-application `vendorType` a marketplace category maps to, so a
 * listing's detailed questionnaire lands in the same review queue (and, for
 * photo and cake, the same Airtable bases) as the public vendor form.
 */
export function applicationTypeFor(category: MarketCategory) {
  return category === 'photography' || category === 'cake' || category === 'decoration' ||
    category === 'catering' || category === 'dj'
    ? category
    : 'other'
}

/** How a price-card line is charged. */
export const PRICE_UNITS = [
  ['event', 'per event'],
  ['session', 'per session'],
  ['day', 'per day'],
  ['hour', 'per hour'],
  ['plate', 'per plate'],
  ['kg', 'per kg'],
  ['person', 'per person'],
  ['piece', 'per piece'],
  ['package', 'package'],
] as const

export function unitLabel(value: unknown) {
  return PRICE_UNITS.find(([v]) => v === value)?.[1] ?? ''
}

/** Areas a vendor can serve; "All over Chennai" matches every area filter. */
export const ALL_CHENNAI = 'All over Chennai'
export const MARKET_AREAS = [ALL_CHENNAI, ...CHENNAI_AREAS]

export const LANGUAGES = ['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam', 'Kannada'] as const

/** Event types a couple can enquire about (mapped onto Leads' list for hand-offs). */
export const EVENT_TYPES = [
  ['wedding', 'Wedding'],
  ['engagement', 'Engagement'],
  ['reception', 'Reception'],
  ['birthday', 'Birthday'],
  ['housewarming', 'Housewarming'],
  ['corporate', 'Corporate function'],
  ['other', 'Other'],
] as const

export function eventTypeLabel(value: unknown) {
  return EVENT_TYPES.find(([v]) => v === value)?.[1] ?? 'Event'
}

export const LISTING_STATUSES = [
  ['draft', 'Draft'],
  ['pending', 'Waiting for review'],
  ['published', 'Live'],
  ['paused', 'Paused'],
  ['rejected', 'Needs changes'],
] as const

export type ListingStatus = (typeof LISTING_STATUSES)[number][0]

export const ENQUIRY_STATUSES = [
  ['new', 'New'],
  ['replied', 'Replied'],
  ['quoted', 'Quoted'],
  ['booked', 'Booked'],
  ['declined', 'Declined'],
  ['closed', 'Closed'],
] as const

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number][0]

export function enquiryStatusLabel(value: unknown) {
  return ENQUIRY_STATUSES.find(([v]) => v === value)?.[1] ?? ''
}

/** A listing needs these before it can be sent for review. */
export const LISTING_MIN = { photos: 3, priceItems: 1, areas: 1, aboutChars: 60 }

export const PASSWORD_MIN = 8

/** ₹ with Indian digit grouping. */
export function rupees(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return ''
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** [value, label] pairs → Payload select options. */
export const toOptionList = (list: readonly (readonly [string, string])[]) =>
  list.map(([value, label]) => ({ value, label }))
