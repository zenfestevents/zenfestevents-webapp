// Server-only marketplace data access. Never import from a client component.
//
// Reads use the Local API (overrideAccess), so this file is the privacy
// boundary: the public only ever gets `PublicVendor`s — published listings with
// no email, phone or review notes. A vendor's phone reaches a couple only after
// the vendor replies to their enquiry (see enquiryForCustomer).
import type { Where } from 'payload'

import type { Customer, Enquiry, Vendor, VendorMedia } from '../payload-types'
import { mediaUrl } from './media'
import { ALL_CHENNAI, categoryLabel, type MarketCategory } from './marketplaceOptions'
import { getPayloadClient } from './payload'

export type PublicPhoto = { id: number; url: string; thumb: string; card: string; alt: string }

export type PublicVendor = {
  id: number
  slug: string
  businessName: string
  category: Vendor['category']
  categoryLabel: string
  service: string
  areas: string[]
  about: string
  priceCard: { item: string; unit: string; price: number; gstIncluded: boolean; note: string }[]
  startingPrice: number | null
  cover: PublicPhoto | null
  gallery: PublicPhoto[]
  instagram: string
  languages: string[]
  /** YYYY-MM-DD, India time. */
  blockedDates: string[]
  phoneVerified: boolean
  since: string
}

export function photo(m: number | VendorMedia | null | undefined): PublicPhoto | null {
  if (!m || typeof m !== 'object') return null
  return {
    id: m.id,
    url: mediaUrl(m as never, 'feature') || mediaUrl(m as never),
    card: mediaUrl(m as never, 'card') || mediaUrl(m as never),
    thumb: mediaUrl(m as never, 'thumbnail') || mediaUrl(m as never),
    alt: m.alt || '',
  }
}

/** A stored date as YYYY-MM-DD in India time (dates are saved as UTC instants). */
export function dayKey(value: string | Date) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export function toPublicVendor(v: Vendor): PublicVendor {
  const gallery = (v.gallery ?? []).map(photo).filter((p): p is PublicPhoto => Boolean(p))
  return {
    id: v.id,
    slug: v.slug,
    businessName: v.businessName,
    category: v.category,
    categoryLabel: categoryLabel(v.category),
    service: v.category === 'other' && v.otherService ? v.otherService : categoryLabel(v.category),
    areas: v.areas ?? [],
    about: v.about ?? '',
    priceCard: (v.priceCard ?? []).map((r) => ({
      item: r.item,
      unit: r.unit,
      price: r.price,
      gstIncluded: r.gstIncluded !== false,
      note: r.note ?? '',
    })),
    startingPrice: v.startingPrice ?? null,
    cover: photo(v.cover) ?? gallery[0] ?? null,
    gallery,
    instagram: v.instagram ?? '',
    languages: v.languages ?? [],
    blockedDates: (v.blockedDates ?? []).map((d) => dayKey(d.date)),
    phoneVerified: Boolean(v.phoneVerified),
    since: v.createdAt,
  }
}

export type VendorFilters = {
  category?: MarketCategory
  area?: string
  /** Show vendors whose starting price is at most this. */
  budget?: number
  /** YYYY-MM-DD — hide vendors who blocked it. */
  date?: string
  q?: string
  sort?: 'recommended' | 'price-low' | 'price-high' | 'new'
}

const SORTS = {
  recommended: '-updatedAt',
  'price-low': 'startingPrice',
  'price-high': '-startingPrice',
  new: '-createdAt',
} as const

export async function listVendors(filters: VendorFilters = {}): Promise<PublicVendor[]> {
  const payload = await getPayloadClient()
  const and: Where[] = [{ listingStatus: { equals: 'published' } }]
  if (filters.category) and.push({ category: { equals: filters.category } })
  if (filters.area) and.push({ areas: { in: [filters.area, ALL_CHENNAI] } })
  if (filters.budget) and.push({ startingPrice: { less_than_equal: filters.budget } })
  if (filters.q) {
    and.push({
      or: [
        { businessName: { like: filters.q } },
        { otherService: { like: filters.q } },
        { about: { like: filters.q } },
      ],
    })
  }
  const { docs } = await payload.find({
    collection: 'vendors',
    where: { and },
    sort: SORTS[filters.sort ?? 'recommended'],
    depth: 1,
    limit: 120,
    overrideAccess: true,
  })
  let vendors = (docs as Vendor[]).map(toPublicVendor)
  if (filters.date) vendors = vendors.filter((v) => !v.blockedDates.includes(filters.date!))
  return vendors
}

export async function getPublicVendor(slug: string): Promise<PublicVendor | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'vendors',
    where: { slug: { equals: slug }, listingStatus: { equals: 'published' } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  return docs[0] ? toPublicVendor(docs[0] as Vendor) : null
}

/** Live listings per category, for the marketplace home. */
export async function categoryCounts(): Promise<Record<string, number>> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'vendors',
    where: { listingStatus: { equals: 'published' } },
    select: { category: true },
    depth: 0,
    limit: 2000,
    overrideAccess: true,
  })
  const counts: Record<string, number> = {}
  for (const d of docs as Pick<Vendor, 'category'>[]) counts[d.category] = (counts[d.category] ?? 0) + 1
  return counts
}

// ---------- enquiries ----------

export type ThreadMessage = { from: 'vendor' | 'customer'; text: string; quote: number | null; at: string }

export type EnquiryView = {
  id: number
  status: Enquiry['status']
  eventType: string
  eventDate: string | null
  guests: number | null
  area: string
  budget: number | null
  message: string
  thread: ThreadMessage[]
  unread: boolean
  createdAt: string
  updatedAt: string
}

function baseEnquiry(e: Enquiry, side: 'vendor' | 'customer'): EnquiryView {
  return {
    id: e.id,
    status: e.status,
    eventType: e.eventType ?? '',
    eventDate: e.eventDate ?? null,
    guests: e.guests ?? null,
    area: e.area ?? '',
    budget: e.budget ?? null,
    message: e.message ?? '',
    thread: (e.thread ?? []).map((m) => ({
      from: m.from,
      text: m.text,
      quote: m.quote ?? null,
      at: m.at,
    })),
    unread: e.unreadFor === side,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

/** What a vendor sees: the couple's name and phone come with the enquiry (it's their lead). */
export type VendorEnquiry = EnquiryView & { customer: { name: string; phone: string; email: string } }

/** What a couple sees: the vendor's contact only once the vendor has replied. */
export type CustomerEnquiry = EnquiryView & {
  vendor: { slug: string; businessName: string; service: string; cover: PublicPhoto | null; live: boolean }
  vendorContact: { phone: string; email: string } | null
}

export async function enquiriesForVendor(vendorId: number): Promise<VendorEnquiry[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'enquiries',
    where: { vendor: { equals: vendorId } },
    sort: '-updatedAt',
    depth: 1,
    limit: 200,
    overrideAccess: true,
  })
  return (docs as Enquiry[]).map((e) => {
    const c = typeof e.customer === 'object' ? (e.customer as Customer) : null
    return {
      ...baseEnquiry(e, 'vendor'),
      customer: { name: c?.name ?? 'Customer', phone: c?.phone ?? '', email: c?.email ?? '' },
    }
  })
}

export async function enquiriesForCustomer(customerId: number): Promise<CustomerEnquiry[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'enquiries',
    where: { customer: { equals: customerId } },
    sort: '-updatedAt',
    depth: 2,
    limit: 200,
    overrideAccess: true,
  })
  return (docs as Enquiry[]).map((e) => {
    const v = typeof e.vendor === 'object' ? (e.vendor as Vendor) : null
    const replied = (e.thread ?? []).some((m) => m.from === 'vendor')
    return {
      ...baseEnquiry(e, 'customer'),
      vendor: {
        slug: v?.slug ?? '',
        businessName: v?.businessName ?? 'Vendor',
        service: v ? toPublicVendor(v).service : '',
        cover: v ? toPublicVendor(v).cover : null,
        live: v?.listingStatus === 'published',
      },
      vendorContact: replied && v ? { phone: v.phone, email: v.email } : null,
    }
  })
}

/** The couple's shortlist as public listings (vendors no longer live are dropped). */
export async function shortlistFor(customer: Customer): Promise<PublicVendor[]> {
  const ids = (customer.shortlist ?? []).map((s) => (typeof s === 'object' ? s.id : s))
  if (!ids.length) return []
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'vendors',
    where: { id: { in: ids }, listingStatus: { equals: 'published' } },
    depth: 1,
    limit: ids.length,
    overrideAccess: true,
  })
  return (docs as Vendor[]).map(toPublicVendor)
}
