// Server-only Zenfest Shop data access. Never import from a client component.
//
// Reads use the Local API (overrideAccess), so this file is the privacy boundary
// for the shop: the public only gets `PublicProduct`s — live products, no cost
// prices, no seller phone or email (a seller is shown by business name only).
import type { Where } from 'payload'

import type { Product, Vendor } from '../payload-types'
import { photo, type PublicPhoto } from './marketplace'
import { getPayloadClient } from './payload'
import {
  SHOP_OCCASIONS,
  discountPercent,
  isOccasion,
  occasionLabel,
  productTypeLabel,
  type ProductSource,
  type ShopOccasion,
} from './shopOptions'

export type PublicProduct = {
  id: number
  slug: string
  title: string
  source: ProductSource
  occasions: ShopOccasion[]
  occasionLabels: string[]
  productType: string
  typeLabel: string
  price: number
  mrp: number | null
  discount: number
  description: string
  images: PublicPhoto[]
  /** Partner store name for affiliate items ("Amazon"). */
  merchant: string
  seller: { businessName: string; slug: string } | null
  shipsTo: 'india' | 'state'
  dispatchDays: number | null
  inStock: boolean
  returnPolicy: string
  featured: boolean
}

/** An outside photo link (affiliate store image) as a gallery photo. */
const linkPhoto = (url: string, alt: string): PublicPhoto => ({ id: 0, url, card: url, thumb: url, alt })

export function toPublicProduct(p: Product): PublicProduct {
  const uploads = [...(p.images ?? []), ...(p.sellerImages ?? [])]
    .map((m) => photo(m as never))
    .filter((x): x is PublicPhoto => Boolean(x))
  const images = uploads.length ? uploads : p.imageUrl ? [linkPhoto(p.imageUrl, p.title)] : []
  const vendor = p.vendor && typeof p.vendor === 'object' ? (p.vendor as Vendor) : null
  const occasions = (p.occasions ?? []).filter(isOccasion)
  return {
    id: p.id,
    slug: p.slug ?? String(p.id),
    title: p.title,
    source: p.source,
    occasions,
    occasionLabels: occasions.map(occasionLabel),
    productType: p.productType,
    typeLabel: productTypeLabel(p.productType),
    price: p.price,
    mrp: p.mrp ?? null,
    discount: discountPercent(p.price, p.mrp),
    description: p.description ?? '',
    images,
    merchant: p.merchant ?? '',
    seller:
      p.source === 'seller' && vendor && vendor.listingStatus === 'published'
        ? { businessName: vendor.businessName, slug: vendor.slug }
        : null,
    shipsTo: p.shipsTo === 'india' ? 'india' : 'state',
    dispatchDays: p.dispatchDays ?? null,
    inStock: p.stock == null || p.stock > 0,
    returnPolicy: p.returnPolicy ?? '',
    featured: Boolean(p.featured),
  }
}

/** Live products the public may see. Own-stock items stay hidden until Zenfest has GST. */
const LIVE: Where[] = [{ status: { equals: 'published' } }, { source: { not_equals: 'zenfest' } }]

export type ProductFilters = {
  occasion?: string
  type?: string
  q?: string
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'new'
  limit?: number
}

const SORTS = { featured: 'sortOrder', 'price-asc': 'price', 'price-desc': '-price', new: '-createdAt' } as const

export async function listProducts(filters: ProductFilters = {}): Promise<PublicProduct[]> {
  const payload = await getPayloadClient()
  const and: Where[] = [...LIVE]
  if (filters.occasion && isOccasion(filters.occasion)) and.push({ occasions: { in: [filters.occasion] } })
  if (filters.type) and.push({ productType: { equals: filters.type } })
  if (filters.q) and.push({ title: { like: filters.q.slice(0, 80) } })
  const { docs } = await payload.find({
    collection: 'products',
    where: { and },
    sort: SORTS[filters.sort ?? 'featured'] ?? 'sortOrder',
    limit: filters.limit ?? 60,
    depth: 1,
    overrideAccess: true,
  })
  return docs.map(toPublicProduct).filter((p) => p.source !== 'seller' || p.seller)
}

export async function getPublicProduct(slug: string): Promise<PublicProduct | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [...LIVE, { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const product = docs[0] ? toPublicProduct(docs[0]) : null
  return product && (product.source !== 'seller' || product.seller) ? product : null
}

/** How many live products each occasion has (for the tiles on /shop), plus `total` (each product once). */
export async function occasionCounts(): Promise<{ byOccasion: Record<string, number>; total: number }> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { and: LIVE },
    select: { occasions: true },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
  const counts: Record<string, number> = Object.fromEntries(SHOP_OCCASIONS.map(([v]) => [v, 0]))
  for (const d of docs) for (const o of d.occasions ?? []) if (o in counts) counts[o]++
  return { byOccasion: counts, total: docs.length }
}

/** The raw product for the affiliate redirect (server only — includes the store link). */
export async function findLiveProductById(id: number) {
  const payload = await getPayloadClient()
  const p = await payload.findByID({ collection: 'products', id, depth: 0, overrideAccess: true }).catch(() => null)
  return p && p.status === 'published' && p.source !== 'zenfest' ? p : null
}
