// Client-safe: the Decoration catalog's option lists and small helpers, shared by the
// collections (admin), the CSV import, the exports and the public /decorations pages.
// Event types, categories, themes, kinds, price modes and statuses are Postgres enums:
// adding one needs `npm run migrate:create` (and `generate:types`).

/**
 * [value, label, code] in grouped order (owner, 2026-10-31). The code is the first part of
 * a new item's code (REC-STG-001); codes already given never change, so old `SHP-…` and
 * `BDY-…` codes stay as they are. Values are stored in the database: never rename one.
 */
export const DECOR_EVENT_TYPES = [
  // Wedding functions
  ['wedding', 'Wedding / Muhurtham', 'WED'],
  ['reception', 'Reception', 'REC'],
  ['engagement', 'Engagement', 'ENG'],
  ['haldi', 'Haldi', 'HLD'],
  ['mehendi', 'Mehendi', 'MHD'],
  ['sangeet', 'Sangeet', 'SNG'],
  // Birthdays
  ['birthday_boy', 'Birthday – boy', 'BDB'],
  ['birthday_girl', 'Birthday – girl', 'BDG'],
  ['first_birthday_boy', 'First birthday – boy', 'FBB'],
  ['first_birthday_girl', 'First birthday – girl', 'FBG'],
  ['birthday_surprise', 'Birthday surprise', 'BSP'],
  // Old catch-all birthday from step 2: kept so existing items stay valid, but no longer
  // offered for new choices (LEGACY_EVENT_TYPES).
  ['birthday', 'Birthday (not specified)', 'BDY'],
  // Family functions
  ['housewarming', 'Housewarming', 'HSW'],
  ['baby_shower', 'Baby shower', 'BBS'],
  ['puberty', 'Puberty ceremony', 'PUB'],
  ['anniversary', 'Anniversary', 'ANV'],
  // Business & others
  ['corporate', 'Corporate', 'CRP'],
  ['shop_opening', 'Opening ceremony', 'OPN'],
  ['sports', 'Sports', 'SPT'],
  ['other', 'Others', 'OTH'],
] as const

/** Kept for existing items only; hidden when choosing an event type. */
export const LEGACY_EVENT_TYPES: readonly string[] = ['birthday']

/** Headings for grouped dropdowns (`<optgroup>`), in DECOR_EVENT_TYPES order. */
export const DECOR_EVENT_GROUPS: readonly { label: string; values: readonly DecorEventType[] }[] = [
  { label: 'Wedding functions', values: ['wedding', 'reception', 'engagement', 'haldi', 'mehendi', 'sangeet'] },
  {
    label: 'Birthdays',
    values: ['birthday_boy', 'birthday_girl', 'first_birthday_boy', 'first_birthday_girl', 'birthday_surprise', 'birthday'],
  },
  { label: 'Family functions', values: ['housewarming', 'baby_shower', 'puberty', 'anniversary'] },
  { label: 'Business & others', values: ['corporate', 'shop_opening', 'sports', 'other'] },
]

/** [value, label, code] — the code is the middle part of an item code. */
export const DECOR_CATEGORIES = [
  ['stage', 'Stage', 'STG'],
  ['entrance', 'Entrance', 'ENT'],
  ['mandap', 'Mandap', 'MDP'],
  ['backdrop', 'Backdrop', 'BKD'],
  ['balloon', 'Balloon', 'BLN'],
  ['flower', 'Flower', 'FLR'],
  ['lighting', 'Lighting', 'LGT'],
  ['kuthuvilakku', 'Kuthuvilakku', 'KTV'],
  ['photo_booth', 'Photo Booth', 'PHB'],
  ['other', 'Other', 'OTH'],
] as const

export const DECOR_THEMES = [
  ['traditional', 'Traditional'],
  ['modern', 'Modern'],
  ['floral', 'Floral'],
  ['minimal', 'Minimal'],
  ['royal', 'Royal'],
  ['pastel', 'Pastel'],
  ['rustic', 'Rustic'],
  ['temple', 'Temple style'],
  ['kids', 'Kids'],
  ['luxury', 'Luxury'],
] as const

export const DECOR_KINDS = [
  ['item', 'Single item'],
  ['package', 'Package (several items together)'],
] as const

/**
 * How the client price is shown on the website, per item. `exact` is the default (owner,
 * 2026-10-31); range / "starting from" / hidden stay available for items the team wants
 * to keep vaguer. The vendor price is never shown, whatever this says.
 */
// Keep this order: it is the Postgres enum's order (changing it would rewrite the type).
export const DECOR_PRICE_MODES = [
  ['range', 'Price range (e.g. ₹25k – ₹35k)'],
  ['from', '“Starting from ₹X”'],
  ['exact', 'Exact client price'],
  ['hidden', 'Hidden — “Contact us for price”'],
] as const

/** Draft = not on the website yet (Quick add), Active = on it, Archived = hidden, kept for old quotes. */
export const DECOR_STATUSES = [
  ['draft', 'Draft'],
  ['active', 'Active'],
  ['archived', 'Archived'],
] as const

export type DecorEventType = (typeof DECOR_EVENT_TYPES)[number][0]
export type DecorCategory = (typeof DECOR_CATEGORIES)[number][0]
export type DecorTheme = (typeof DECOR_THEMES)[number][0]
export type DecorKind = (typeof DECOR_KINDS)[number][0]
export type DecorPriceMode = (typeof DECOR_PRICE_MODES)[number][0]
export type DecorStatus = (typeof DECOR_STATUSES)[number][0]

/** [value, label, …] lists → Payload select options. */
export const decorOptions = (list: readonly (readonly [string, string, ...string[]])[]) =>
  list.map(([value, label]) => ({ value, label }))

const labelIn = (list: readonly (readonly [string, string, ...string[]])[], value: unknown) =>
  list.find(([v]) => v === value)?.[1] ?? ''

export const eventTypeLabel = (v: unknown) => labelIn(DECOR_EVENT_TYPES, v)
export const categoryLabel = (v: unknown) => labelIn(DECOR_CATEGORIES, v)

/** What to show for an item's event type: the typed text when it is "Others". */
export const eventTypeText = (v: unknown, other?: string | null) =>
  v === 'other' && other?.trim() ? other.trim() : eventTypeLabel(v)
/** What to show for an item's category: the typed text when it is "Other". */
export const categoryText = (v: unknown, other?: string | null) =>
  v === 'other' && other?.trim() ? other.trim() : categoryLabel(v)
export const themeLabel = (v: unknown) => labelIn(DECOR_THEMES, v)

export const isDecorEventType = (v: unknown): v is DecorEventType => DECOR_EVENT_TYPES.some(([x]) => x === v)
export const isDecorCategory = (v: unknown): v is DecorCategory => DECOR_CATEGORIES.some(([x]) => x === v)
export const isDecorTheme = (v: unknown): v is DecorTheme => DECOR_THEMES.some(([x]) => x === v)

/** "WED-STG-" for a wedding stage: the part of an item code before the running number. */
export function itemCodePrefix(eventType: unknown, category: unknown): string {
  const ev = DECOR_EVENT_TYPES.find(([v]) => v === eventType)?.[2] ?? 'OTH'
  const cat = DECOR_CATEGORIES.find(([v]) => v === category)?.[2] ?? 'OTH'
  return `${ev}-${cat}-`
}

/** Running numbers are at least 3 digits: WED-STG-001 … WED-STG-999, then WED-STG-1000. */
export const formatItemCode = (prefix: string, n: number) => `${prefix}${String(n).padStart(3, '0')}`

/** Whole rupees as "₹1,25,000" (Indian grouping). */
export function rupees(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** Client price − vendor price, or null when either is missing. */
export function marginOf(clientPrice: unknown, vendorPrice: unknown): number | null {
  const c = Number(clientPrice)
  const v = Number(vendorPrice)
  if (clientPrice == null || vendorPrice == null || !Number.isFinite(c) || !Number.isFinite(v)) return null
  return c - v
}
