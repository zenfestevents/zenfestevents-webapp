// Server-only Decoration catalog data access. Never import from a client component.
//
// This file is the privacy boundary for /decorations (like lib/shop.ts): the public gets
// `PublicDecoration`s of ACTIVE items only, copied field by field. The vendor (cost) price,
// supplier, notes, margin and price history are never selected, and the client price leaves
// this file only as the text `priceFor()` builds for a logged-in client.
import type { Where } from 'payload'

import type { Customer, DecorItem, DecorPhoto } from '../payload-types'
import { CONTENT_TAGS, cachedContent } from './contentCache'
import {
  ALSO_SUITS_CHOICES,
  DECOR_CATEGORIES,
  DECOR_EVENT_TYPES,
  DECOR_MATERIALS,
  DECOR_THEMES,
  categoryText,
  eventTypeLabel,
  eventTypeText,
  isDecorCategory,
  isDecorEventType,
  isDecorMaterial,
  isDecorTheme,
  materialLabel,
  rupees,
  themeLabel,
  type DecorPriceMode,
} from './decorOptions'
import { dayKey, type PublicPhoto } from './marketplace'
import { mediaUrl } from './media'
import { getPayloadClient } from './payload'

export type PublicDecoration = {
  id: number
  slug: string
  /** "WED-STG-014": clients quote it on WhatsApp. */
  code: string
  title: string
  eventType: string
  eventLabel: string
  /** Other events it also suits: [value, label], never the main one. */
  alsoSuits: [string, string][]
  category: string
  categoryLabel: string
  /** "" for an old item saved before this was asked. */
  material: string
  materialLabel: string
  themes: string[]
  kind: 'item' | 'package'
  size: string
  includes: string
  description: string
  /** First photo is the cover. */
  photos: PublicPhoto[]
}

/** Only these columns are read from the database; anything else (cost price…) never loads. */
const PUBLIC_COLUMNS = {
  photos: true,
  title: true,
  eventType: true,
  eventTypeOther: true,
  alsoSuits: true,
  category: true,
  categoryOther: true,
  material: true,
  themes: true,
  kind: true,
  size: true,
  includes: true,
  description: true,
  itemCode: true,
  slug: true,
  status: true,
} as const

const ACTIVE: Where = { status: { equals: 'active' } }

function toPhoto(m: number | DecorPhoto | null | undefined): PublicPhoto | null {
  if (!m || typeof m !== 'object') return null
  return {
    id: m.id,
    // The 1600 px copy for the gallery; the card (4:3) and thumbnail for grids.
    url: mediaUrl(m as never, 'large') || mediaUrl(m as never),
    card: mediaUrl(m as never, 'card') || mediaUrl(m as never),
    thumb: mediaUrl(m as never, 'thumbnail') || mediaUrl(m as never),
    alt: m.alt || '',
  }
}

type PublicRow = Pick<
  DecorItem,
  | 'id'
  | 'photos'
  | 'title'
  | 'eventType'
  | 'eventTypeOther'
  | 'alsoSuits'
  | 'category'
  | 'categoryOther'
  | 'material'
  | 'themes'
  | 'kind'
  | 'size'
  | 'includes'
  | 'description'
  | 'itemCode'
  | 'slug'
>

function toPublic(d: PublicRow): PublicDecoration {
  const photos = (d.photos ?? []).map(toPhoto).filter((p): p is PublicPhoto => Boolean(p))
  return {
    id: d.id,
    slug: d.slug ?? String(d.id),
    code: d.itemCode ?? '',
    title: d.title ?? '',
    eventType: d.eventType,
    eventLabel: eventTypeText(d.eventType, d.eventTypeOther),
    alsoSuits: (d.alsoSuits ?? [])
      .filter((v) => v !== d.eventType && ALSO_SUITS_CHOICES.includes(v as never))
      .map((v): [string, string] => [v, eventTypeLabel(v)]),
    category: d.category,
    categoryLabel: categoryText(d.category, d.categoryOther),
    material: isDecorMaterial(d.material) ? d.material : '',
    materialLabel: materialLabel(d.material),
    themes: (d.themes ?? []).map(themeLabel).filter(Boolean),
    kind: d.kind === 'package' ? 'package' : 'item',
    size: d.size ?? '',
    includes: d.includes ?? '',
    description: d.description ?? '',
    photos,
  }
}

export type DecorFilters = { event?: string; category?: string; material?: string; theme?: string; page?: number }

/** An item belongs to an event page if that is its main event or one it also suits. */
const forEvent = (event: string): Where => ({
  or: [{ eventType: { equals: event } }, { alsoSuits: { equals: event } }],
})

export const DECOR_PAGE_SIZE = 24

export async function listDecorations(
  filters: DecorFilters = {},
): Promise<{ items: PublicDecoration[]; total: number; page: number; pages: number }> {
  const payload = await getPayloadClient()
  const and: Where[] = [ACTIVE]
  if (isDecorEventType(filters.event)) and.push(forEvent(filters.event))
  if (isDecorCategory(filters.category)) and.push({ category: { equals: filters.category } })
  if (isDecorMaterial(filters.material)) and.push({ material: { equals: filters.material } })
  if (isDecorTheme(filters.theme)) and.push({ themes: { in: [filters.theme] } })
  const res = await payload.find({
    collection: 'decor-items',
    where: { and },
    sort: '-createdAt',
    limit: DECOR_PAGE_SIZE,
    page: Math.max(1, filters.page ?? 1),
    depth: 1,
    select: PUBLIC_COLUMNS,
    overrideAccess: true,
  })
  return {
    items: res.docs.map(toPublic).filter((d) => d.photos.length > 0),
    total: res.totalDocs,
    page: res.page ?? 1,
    pages: res.totalPages,
  }
}

/**
 * How many active decorations each event type, category and material has (for the filter chips).
 * An item counts once under its main event and once under each event it also suits.
 * `byTheme` counts only the items shown for `event` (all of them when no event is chosen).
 */
export async function decorationCounts(event = ''): Promise<{
  byEvent: Record<string, number>
  byCategory: Record<string, number>
  byMaterial: Record<string, number>
  byTheme: Record<string, number>
  total: number
}> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'decor-items',
    where: ACTIVE,
    select: { eventType: true, alsoSuits: true, category: true, material: true, themes: true },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
  const byEvent: Record<string, number> = Object.fromEntries(DECOR_EVENT_TYPES.map(([v]) => [v, 0]))
  const byCategory: Record<string, number> = Object.fromEntries(DECOR_CATEGORIES.map(([v]) => [v, 0]))
  const byMaterial: Record<string, number> = Object.fromEntries(DECOR_MATERIALS.map(([v]) => [v, 0]))
  const byTheme: Record<string, number> = Object.fromEntries(DECOR_THEMES.map(([v]) => [v, 0]))
  for (const d of docs) {
    const events = new Set([d.eventType, ...(d.alsoSuits ?? []).filter((v) => ALSO_SUITS_CHOICES.includes(v as never))])
    for (const e of events) byEvent[e] = (byEvent[e] ?? 0) + 1
    byCategory[d.category] = (byCategory[d.category] ?? 0) + 1
    if (d.material) byMaterial[d.material] = (byMaterial[d.material] ?? 0) + 1
    if (!event || events.has(event as never)) for (const t of d.themes ?? []) byTheme[t] = (byTheme[t] ?? 0) + 1
  }
  return { byEvent, byCategory, byMaterial, byTheme, total: docs.length }
}

/** What the price block needs: kept on the server, only the text it builds is shown. */
type PriceFields = { clientPrice: number | null; mode: DecorPriceMode; validTill: string | null }

export async function getPublicDecoration(
  slug: string,
): Promise<{ item: PublicDecoration; price: PriceFields } | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'decor-items',
    where: { and: [ACTIVE, { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    select: { ...PUBLIC_COLUMNS, clientPrice: true, publicDisplay: true, validTill: true },
    overrideAccess: true,
  })
  const d = docs[0]
  if (!d) return null
  const item = toPublic(d)
  if (!item.photos.length) return null
  return {
    item,
    price: { clientPrice: d.clientPrice ?? null, mode: d.publicDisplay ?? 'exact', validTill: d.validTill ?? null },
  }
}

/** A few more of the same event type, for the bottom of an item page. */
export async function relatedDecorations(item: PublicDecoration, limit = 4): Promise<PublicDecoration[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'decor-items',
    where: { and: [ACTIVE, forEvent(item.eventType), { id: { not_equals: item.id } }] },
    sort: '-createdAt',
    limit,
    depth: 1,
    select: PUBLIC_COLUMNS,
    overrideAccess: true,
  })
  return docs.map(toPublic).filter((d) => d.photos.length > 0)
}

/** Every active item's address, for the sitemap. */
export async function listDecorationSlugs(): Promise<string[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'decor-items',
    where: ACTIVE,
    select: { slug: true },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
  return docs.map((d) => d.slug).filter((s): s is string => Boolean(s))
}

const readHasAny = cachedContent(
  async () => {
    const payload = await getPayloadClient()
    const res = await payload.count({ collection: 'decor-items', where: ACTIVE, overrideAccess: true })
    return res.totalDocs > 0
  },
  'decorations-any',
  [CONTENT_TAGS.decorations],
)

/** Whether to show Decorations in the menu and footer: only once something is on the site. */
export async function hasDecorations(): Promise<boolean> {
  try {
    return await readHasAny()
  } catch {
    return false
  }
}

// ── Prices ───────────────────────────────────────────────────────────────────────────────

/**
 * What the price block shows.
 *  - `shown`: the text to display (exact, range, "from"), `note` is a small line under it.
 *  - `login`: not a logged-in client → ask them to log in or join.
 *  - `ask`: the team keeps this price off the website ("Contact us"), or it has expired.
 *  - `limit`: today's price limit is used up, or the account is blocked → WhatsApp us.
 */
export type PublicPrice =
  | { state: 'shown'; text: string; note: string }
  | { state: 'login' }
  | { state: 'ask'; reason: 'hidden' | 'expired' }
  | { state: 'limit' }

/** 1,18,000 → 1,20,000 (nearest 1,000; 500 under ₹10,000). */
function roundNice(n: number) {
  const step = n >= 10_000 ? 1000 : 500
  return Math.round(n / step) * step
}

function priceText(mode: DecorPriceMode, clientPrice: number, spreadPercent: number): string {
  if (mode === 'from') return `Starting from ${rupees(clientPrice)}`
  if (mode === 'range') {
    // Whole-number maths first: 50,000 × 1.15 in floating point is 57,499.999…, which rounded down.
    const low = roundNice((clientPrice * (100 - spreadPercent)) / 100)
    const high = roundNice((clientPrice * (100 + spreadPercent)) / 100)
    return low === high ? rupees(low) : `${rupees(low)} – ${rupees(high)}`
  }
  return rupees(clientPrice)
}

const NOTE = 'Final price depends on the venue, date and any changes — we confirm it in your quote.'

/**
 * The price for a logged-in client, with the daily limit. Seeing the same item again on the
 * same day is free; the unique index on `decor-views` (client, item, day) keeps the count
 * honest, so a second tab can't count twice. Only clients (`customers`) see prices: a vendor
 * or staff login gets `login`.
 */
export async function priceFor(
  itemId: number,
  fields: PriceFields,
  customer: Customer | null,
): Promise<PublicPrice> {
  if (!customer) return { state: 'login' }
  const payload = await getPayloadClient()
  // Re-read the flag: it is a staff-only field, so the session's own copy of the account
  // doesn't carry it.
  const account = await payload.findByID({
    collection: 'customers',
    id: customer.id,
    select: { decorBlocked: true },
    depth: 0,
    overrideAccess: true,
  })
  if (account.decorBlocked) return { state: 'limit' }
  if (fields.mode === 'hidden' || fields.clientPrice == null) return { state: 'ask', reason: 'hidden' }
  if (fields.validTill && new Date(fields.validTill).getTime() < Date.now()) return { state: 'ask', reason: 'expired' }

  const settings = await payload.findGlobal({ slug: 'decor-settings', depth: 0, overrideAccess: true })
  const limit = settings.dailyPriceLimit ?? 40
  const today = dayKey(new Date())
  const mine: Where = { and: [{ customer: { equals: customer.id } }, { day: { equals: today } }] }

  const seen = await payload.count({
    collection: 'decor-views',
    where: { and: [mine, { item: { equals: itemId } }] },
    overrideAccess: true,
  })
  if (!seen.totalDocs) {
    const used = await payload.count({ collection: 'decor-views', where: mine, overrideAccess: true })
    if (used.totalDocs >= limit) return { state: 'limit' }
    try {
      await payload.create({
        collection: 'decor-views',
        data: { customer: customer.id, item: itemId, day: today },
        overrideAccess: true,
      })
    } catch {
      // A second request for the same item at the same moment: the unique index refused it.
    }
  }
  return {
    state: 'shown',
    text: priceText(fields.mode, fields.clientPrice, settings.rangeSpreadPercent ?? 15),
    note: NOTE,
  }
}

/**
 * What the stage question shows when the client says their venue has no stage. Like prices, the
 * amount goes only to a logged-in client (and not to a blocked one); everyone else gets the
 * log-in line. It is a single figure from Decoration settings, so it does not count towards the
 * daily price limit.
 */
export type StagePrice = { state: 'shown'; text: string } | { state: 'login' }

export async function stagePriceFor(customer: Customer | null): Promise<StagePrice> {
  if (!customer) return { state: 'login' }
  const payload = await getPayloadClient()
  const [account, settings] = await Promise.all([
    payload.findByID({
      collection: 'customers',
      id: customer.id,
      select: { decorBlocked: true },
      depth: 0,
      overrideAccess: true,
    }),
    payload.findGlobal({ slug: 'decor-settings', depth: 0, overrideAccess: true }),
  ])
  const cost = settings.stageCost
  if (account.decorBlocked || cost == null || cost <= 0) {
    return { state: 'shown', text: 'Stage setup is charged separately. We confirm it in your quote.' }
  }
  return { state: 'shown', text: `Stage setup is extra: from ${rupees(cost)}. We confirm it in your quote.` }
}
