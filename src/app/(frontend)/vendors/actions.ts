'use server'

// Vendor dashboard Server Actions. Each one takes the vendor from the session
// (never from the request), writes only whitelisted fields of their own record
// through the Local API, and re-checks ownership of any photo or enquiry it touches.
import { refresh } from 'next/cache'

import type { Vendor } from '../../../payload-types'
import { UserError, dayToDate, fail, int, oneOf, text } from '../../../lib/formCheck'
import { listingGaps } from '../../../lib/listing'
import { dayKey } from '../../../lib/marketplace'
import { sendMail, siteUrl, teamInbox } from '../../../lib/marketplaceMail'
import {
  LANGUAGES,
  MARKET_AREAS,
  PRICE_UNITS,
  categoryLabel,
  isCategory,
  rupees,
} from '../../../lib/marketplaceOptions'
import { getPayloadClient } from '../../../lib/payload'
import { normalizePhone } from '../../../lib/phoneVerification'
import { getVendor } from '../../../lib/session'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function me(): Promise<Vendor> {
  const vendor = await getVendor()
  if (!vendor) throw new UserError('Your session has ended. Please log in again.')
  return vendor
}

async function save(id: number, data: Partial<Vendor>) {
  const payload = await getPayloadClient()
  return payload.update({ collection: 'vendors', id, data, overrideAccess: true, depth: 0 })
}

const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))

// ---------- listing ----------

export type ListingInput = {
  name: string
  phone: string
  businessName: string
  category: string
  otherService: string
  areas: string[]
  about: string
  instagram: string
  languages: string[]
}

export async function saveListing(input: ListingInput): Promise<Result> {
  try {
    const vendor = await me()
    const name = text(input.name, 120)
    const businessName = text(input.businessName, 120)
    const phone = normalizePhone(input.phone)
    if (name.length < 2) throw new UserError('Enter your name.')
    if (businessName.length < 2) throw new UserError('Enter your business name.')
    if (!phone) throw new UserError('Enter a valid 10-digit mobile number.')
    if (!isCategory(input.category)) throw new UserError('Choose what you offer.')
    const otherService = input.category === 'other' ? text(input.otherService, 80) : ''
    if (input.category === 'other' && !otherService) throw new UserError('Tell us which service you offer.')
    const areas = [...new Set((input.areas ?? []).filter((a) => MARKET_AREAS.includes(a)))].slice(0, 60)
    const langs = LANGUAGES.map((l) => l.toLowerCase())
    const languages = [...new Set((input.languages ?? []).filter((l) => langs.includes(l)))]
    let instagram = text(input.instagram, 300)
    if (instagram && !/^https?:\/\//i.test(instagram)) {
      instagram = instagram.startsWith('@')
        ? `https://instagram.com/${instagram.slice(1)}`
        : `https://${instagram}`
    }

    await save(vendor.id, {
      name,
      businessName,
      // A changed number is no longer the one verified at sign-up.
      phone,
      phoneVerified: phone === vendor.phone ? vendor.phoneVerified : false,
      category: input.category,
      otherService: otherService || null,
      areas,
      about: text(input.about, 3000),
      instagram,
      languages: languages as Vendor['languages'],
    })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- prices ----------

export type PriceRowInput = { item: string; unit: string; price: number | string; gstIncluded: boolean; note: string }

export async function savePrices(rows: PriceRowInput[]): Promise<Result> {
  try {
    const vendor = await me()
    if (!Array.isArray(rows) || rows.length > 25) throw new UserError('Keep the price card to 25 lines.')
    const clean = rows
      .map((r) => ({
        item: text(r.item, 80),
        unit: oneOf(PRICE_UNITS, r.unit),
        price: int(r.price, 0, 10_00_00_000),
        gstIncluded: r.gstIncluded !== false,
        note: text(r.note, 140),
      }))
      .filter((r) => r.item || r.price != null)
    for (const r of clean) {
      if (!r.item) throw new UserError('Every price needs a name, e.g. "Candid photography".')
      if (!r.unit) throw new UserError(`Choose how "${r.item}" is charged.`)
      if (r.price == null) throw new UserError(`Enter a price for "${r.item}".`)
    }
    await save(vendor.id, { priceCard: clean as Vendor['priceCard'] })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- photos ----------

/** Sets the gallery order and cover. Every id must be one of this vendor's own photos. */
export async function saveGallery(input: { ids: number[]; coverId: number | null }): Promise<Result> {
  try {
    const vendor = await me()
    const ids = [...new Set((input.ids ?? []).map(Number).filter(Number.isInteger))].slice(0, 30)
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'vendor-media',
      where: { id: { in: ids }, vendor: { equals: vendor.id } },
      depth: 0,
      limit: 30,
      overrideAccess: true,
    })
    const owned = new Set(docs.map((d) => d.id))
    const gallery = ids.filter((id) => owned.has(id))
    const cover = input.coverId && owned.has(Number(input.coverId)) ? Number(input.coverId) : (gallery[0] ?? null)
    await save(vendor.id, { gallery, cover })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deletePhoto(id: number): Promise<Result> {
  try {
    const vendor = await me()
    const payload = await getPayloadClient()
    const photo = await payload
      .findByID({ collection: 'vendor-media', id: Number(id), depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!photo || idOf(photo.vendor) !== vendor.id) throw new UserError('Photo not found.')
    const gallery = (vendor.gallery ?? []).map(idOf).filter((g) => g !== photo.id)
    const cover = idOf(vendor.cover) === photo.id ? (gallery[0] ?? null) : idOf(vendor.cover)
    await save(vendor.id, { gallery, cover: cover ?? null })
    await payload.delete({ collection: 'vendor-media', id: photo.id, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- availability ----------

export async function saveBlockedDates(rows: { date: string; note: string }[]): Promise<Result> {
  try {
    const vendor = await me()
    if (!Array.isArray(rows) || rows.length > 300) throw new UserError('Too many dates.')
    const seen = new Set<string>()
    const blockedDates: { date: string; note: string }[] = []
    for (const r of rows) {
      const d = dayToDate(r.date)
      if (!d) continue
      const key = dayKey(d)
      if (seen.has(key)) continue
      seen.add(key)
      blockedDates.push({ date: d.toISOString(), note: text(r.note, 80) })
    }
    blockedDates.sort((a, b) => a.date.localeCompare(b.date))
    await save(vendor.id, { blockedDates })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- review & visibility ----------

export async function submitForReview(): Promise<Result> {
  try {
    const vendor = await me()
    if (vendor.listingStatus === 'published' || vendor.listingStatus === 'pending') return { ok: true }
    const gaps = listingGaps(vendor)
    if (gaps.length) throw new UserError(gaps[0])
    await save(vendor.id, { listingStatus: 'pending', submittedAt: new Date().toISOString() })
    await sendMail(teamInbox(), `Listing to review: ${vendor.businessName}`, [
      `${vendor.businessName} (${categoryLabel(vendor.category)}) sent their marketplace listing for review.`,
      `Contact: ${vendor.name}, ${vendor.phone}${vendor.phoneVerified ? ' (verified)' : ''}, ${vendor.email}`,
      `Areas: ${(vendor.areas ?? []).join(', ')}`,
      `Prices: ${(vendor.priceCard ?? []).map((r) => `${r.item} ${rupees(r.price)}`).join('; ')}`,
      '',
      `Check it and set "Listing status" to Live: ${siteUrl()}/admin/collections/vendors/${vendor.id}`,
    ])
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Live ↔ paused. Only a listing the team already approved can be resumed. */
export async function setPaused(paused: boolean): Promise<Result> {
  try {
    const vendor = await me()
    if (paused && vendor.listingStatus === 'published') await save(vendor.id, { listingStatus: 'paused' })
    if (!paused && vendor.listingStatus === 'paused') await save(vendor.id, { listingStatus: 'published' })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- enquiries ----------

async function ownEnquiry(vendorId: number, id: unknown) {
  const payload = await getPayloadClient()
  const enquiry = await payload
    .findByID({ collection: 'enquiries', id: Number(id), depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!enquiry || idOf(enquiry.vendor) !== vendorId) throw new UserError('Enquiry not found.')
  return enquiry
}

export async function replyToEnquiry(input: { id: number; text: string; quote?: number | string | null }): Promise<Result> {
  try {
    const vendor = await me()
    const enquiry = await ownEnquiry(vendor.id, input.id)
    const body = text(input.text, 2000)
    const quote = int(input.quote, 0, 10_00_00_000)
    if (!body) throw new UserError('Write a reply first.')
    if ((enquiry.thread ?? []).length >= 100) throw new UserError('This conversation is full — call the couple instead.')
    const status =
      quote != null ? 'quoted' : enquiry.status === 'new' ? 'replied' : enquiry.status
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'enquiries',
      id: enquiry.id,
      data: {
        thread: [
          ...(enquiry.thread ?? []),
          { from: 'vendor', text: body, quote, at: new Date().toISOString() },
        ],
        status,
        unreadFor: 'customer',
      },
      overrideAccess: true,
    })
    const customer = typeof enquiry.customer === 'object' ? enquiry.customer : null
    await sendMail(customer?.email, `${vendor.businessName} replied to your enquiry`, [
      `Hi ${customer?.name ?? ''},`,
      '',
      `${vendor.businessName} replied${quote != null ? ` with a quote of ${rupees(quote)}` : ''}:`,
      '',
      body,
      '',
      `Read and reply in your account: ${siteUrl()}/account?tab=enquiries`,
    ])
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Booked / declined / closed. Booking an enquiry with a date also blocks that date. */
export async function setEnquiryStatus(input: { id: number; status: string }): Promise<Result> {
  try {
    const vendor = await me()
    const enquiry = await ownEnquiry(vendor.id, input.id)
    const status = oneOf([['booked', ''], ['declined', ''], ['closed', ''], ['replied', '']] as const, input.status)
    if (!status) throw new UserError('Unknown status.')
    const payload = await getPayloadClient()
    await payload.update({ collection: 'enquiries', id: enquiry.id, data: { status }, overrideAccess: true })
    if (status === 'booked' && enquiry.eventDate) {
      const key = dayKey(enquiry.eventDate)
      const blocked = vendor.blockedDates ?? []
      if (!blocked.some((b) => dayKey(b.date) === key)) {
        const customer = typeof enquiry.customer === 'object' ? enquiry.customer : null
        await save(vendor.id, {
          blockedDates: [...blocked, { date: enquiry.eventDate, note: `Booked: ${customer?.name ?? 'enquiry'}` }]
            .sort((a, b) => a.date.localeCompare(b.date)),
        })
      }
    }
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function markEnquiryRead(id: number): Promise<Result> {
  try {
    const vendor = await me()
    const enquiry = await ownEnquiry(vendor.id, id)
    if (enquiry.unreadFor === 'vendor') {
      const payload = await getPayloadClient()
      await payload.update({ collection: 'enquiries', id: enquiry.id, data: { unreadFor: null }, overrideAccess: true })
    }
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}
