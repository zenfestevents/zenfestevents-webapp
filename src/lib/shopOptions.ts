// Option lists for the Zenfest Shop, shared by client components, the Products
// collection and Server Actions. Keep this file free of server imports (see CLAUDE.md).
//
// Occasions are stored as text (`hasMany`) and checked against SHOP_OCCASIONS,
// like vendor `areas`, so adding one needs no Postgres enum migration.
// PRODUCT_TYPES, PRODUCT_SOURCES and SHIPS_TO are selects (enums): changing them
// needs `migrate:create`.

/** Occasions, as [value, label, one-line description]. Order = order of the tiles on /shop. */
export const SHOP_OCCASIONS = [
  ['wedding', 'Wedding', 'Mandap, muhurtham and the big day'],
  ['haldi', 'Haldi', 'Yellow props, flower jewellery, haldi kits'],
  ['mehendi', 'Mehendi', 'Cones, cushions, swings and favours'],
  ['sangeet', 'Sangeet', 'Photo booth props, dance-floor decor'],
  ['reception', 'Reception', 'Stage decor, gifts and lighting'],
  ['engagement', 'Engagement', 'Ring platters, nichayathartham sets'],
  ['birthday', 'Birthday', 'Balloons, cake toppers, return gifts'],
  ['baby-shower', 'Baby shower', 'Valaikappu bangles, seemantham decor'],
  ['housewarming', 'Housewarming', 'Griha pravesh decor and gifts'],
  ['pooja', 'Pooja & festivals', 'Diyas, rangoli, toran and pooja sets'],
  ['corporate', 'Corporate', 'Award trophies, hampers, branded decor'],
] as const

export type ShopOccasion = (typeof SHOP_OCCASIONS)[number][0]

/** What kind of product, as [value, label]. */
export const PRODUCT_TYPES = [
  ['decor', 'Decor & props'],
  ['return-gifts', 'Return gifts'],
  ['gifts', 'Gifts'],
  ['outfits', 'Outfits & accessories'],
  ['jewellery', 'Jewellery'],
  ['stationery', 'Invitations & stationery'],
  ['pooja', 'Pooja items'],
  ['party', 'Party supplies'],
] as const

export type ProductType = (typeof PRODUCT_TYPES)[number][0]

/**
 * Who sells the item. Zenfest is a platform, never the seller of goods, until it
 * registers for GST (see IDEAS.md / CLAUDE.md "Zenfest Shop"):
 * - `affiliate`: bought on another store (Amazon, Flipkart, FNP…); Zenfest earns commission.
 * - `seller`: a marketplace vendor sells and ships; the buyer pays the seller.
 * - `zenfest`: Zenfest's own stock — reserved for after GST, hidden on the site.
 */
export const PRODUCT_SOURCES = [
  ['affiliate', 'Partner store (affiliate link)'],
  ['seller', 'Zenfest seller'],
  ['zenfest', 'Zenfest (own stock — after GST)'],
] as const

export type ProductSource = (typeof PRODUCT_SOURCES)[number][0]

export const SHIPS_TO = [
  ['india', 'All India'],
  ['state', 'Seller’s state only'],
] as const

export const occasionLabel = (v: unknown) => SHOP_OCCASIONS.find(([o]) => o === v)?.[1] ?? ''
export const productTypeLabel = (v: unknown) => PRODUCT_TYPES.find(([t]) => t === v)?.[1] ?? ''
export const isOccasion = (v: unknown): v is ShopOccasion => SHOP_OCCASIONS.some(([o]) => o === v)
export const isProductType = (v: unknown): v is ProductType => PRODUCT_TYPES.some(([t]) => t === v)

/** Keeps only known values, without duplicates. */
export const cleanList = <T extends string>(values: unknown, ok: (v: unknown) => v is T): T[] =>
  Array.isArray(values) ? [...new Set(values.filter(ok))] : []

/** % off MRP, or 0 when there's no real discount. */
export function discountPercent(price: number | null | undefined, mrp: number | null | undefined) {
  if (!price || !mrp || mrp <= price) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}

/** Store name for an affiliate link ("amazon.in" → "Amazon"). */
export function merchantFromUrl(url: string) {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
  const known: [RegExp, string][] = [
    [/(^|\.)amazon\.in$|(^|\.)amzn\.(in|to)$/, 'Amazon'],
    [/(^|\.)flipkart\.com$|(^|\.)fkrt\.it$/, 'Flipkart'],
    [/(^|\.)myntra\.com$/, 'Myntra'],
    [/(^|\.)fnp\.com$/, 'Ferns N Petals'],
    [/(^|\.)ajio\.com$/, 'AJIO'],
    [/(^|\.)nykaa(fashion)?\.com$/, 'Nykaa'],
    [/(^|\.)meesho\.com$/, 'Meesho'],
    [/(^|\.)igp\.com$/, 'IGP'],
    [/(^|\.)etsy\.com$/, 'Etsy'],
  ]
  return known.find(([re]) => re.test(host))?.[1] ?? host
}
