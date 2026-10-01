// Option lists and small helpers shared by the gift registry's client components
// and its Payload collections. Keep this file free of server imports — see the
// client/server note in CLAUDE.md.
//
// `select` options are Postgres enums: adding or renaming a value needs
// `npm run migrate:create` like any other schema change.

export { toOptions } from './hostOptions'

/** Occasions a registry can be made for, as [value, label]. */
export const REGISTRY_EVENT_TYPES = [
  ['wedding', 'Wedding'],
  ['engagement', 'Engagement'],
  ['reception', 'Reception'],
  ['housewarming', 'Housewarming'],
  ['birthday', 'Birthday'],
  ['baby-shower', 'Baby shower / valaikappu'],
  ['naming', 'Naming ceremony'],
  ['pooja', 'Pooja / religious function'],
  ['anniversary', 'Anniversary'],
  ['other', 'Other'],
] as const

export const ITEM_TYPES = [
  ['affiliate_link', 'Online product'],
  ['custom_offline', 'Gift from any shop'],
  ['cash_fund', 'Shagun / cash fund'],
] as const

export const RSVP_OPTIONS = [
  ['pending', 'Not replied'],
  ['yes', 'Coming'],
  ['maybe', 'Maybe'],
  ['no', 'Not coming'],
] as const

export const GUEST_SIDES = [
  ['family', 'Family'],
  ['friends', 'Friends'],
  ['work', 'Work'],
  ['other', 'Other'],
] as const

/** Ideas offered when a host turns on a cash fund. */
export const FUND_PRESETS = [
  'Honeymoon fund',
  'New home fund',
  'Kitchen & home setup',
  'Shagun / blessings',
  'Baby’s first year',
  'Education fund',
]

/** Quick-pick amounts on a guest's shagun panel (₹). */
export const GIFT_AMOUNTS = [1001, 2501, 5001, 11001]

/** Lead-banner event types (subset of the main enquiry form). */
export const LEAD_EVENT_TYPES = [
  ['wedding', 'Wedding'],
  ['birthday', 'Birthday'],
  ['corporate', 'Corporate event'],
  ['housewarming', 'Housewarming'],
  ['other', 'Other'],
] as const

export const labelFor = (list: readonly (readonly [string, string])[], value?: string | null) =>
  list.find(([v]) => v === value)?.[1] ?? value ?? ''

/** ₹ amount in Indian grouping, no decimals: 125000 → "₹1,25,000". */
export const formatINR = (n?: number | null) =>
  n == null ? '' : `₹${Math.round(n).toLocaleString('en-IN')}`

/** Registry addresses: lowercase letters, digits and single hyphens, 3–40 chars. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,39}$/

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

/** Online stores we recognise, by hostname suffix. */
const MERCHANTS: [string, string][] = [
  ['amazon.in', 'Amazon'],
  ['amzn.in', 'Amazon'],
  ['amzn.to', 'Amazon'],
  ['flipkart.com', 'Flipkart'],
  ['fkrt.it', 'Flipkart'],
  ['myntra.com', 'Myntra'],
  ['pepperfry.com', 'Pepperfry'],
  ['ajio.com', 'AJIO'],
  ['nykaa.com', 'Nykaa'],
  ['tatacliq.com', 'Tata CLiQ'],
  ['croma.com', 'Croma'],
  ['ikea.com', 'IKEA'],
  ['urbanladder.com', 'Urban Ladder'],
  ['firstcry.com', 'FirstCry'],
]

export function detectMerchant(url?: string | null): string {
  if (!url) return ''
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const hit = MERCHANTS.find(([d]) => host === d || host.endsWith(`.${d}`))
    if (hit) return hit[1]
    const name = host.split('.').slice(-2, -1)[0] || host
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return ''
  }
}
