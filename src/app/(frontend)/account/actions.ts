'use server'

// Couple (customer) Server Actions: profile, shortlist, quote requests to
// marketplace vendors, replies, and handing a plan to the Zenfest team. The
// couple always comes from the session; enquiries are re-checked for ownership.
import { refresh } from 'next/cache'

import type { Customer, Vendor } from '../../../payload-types'
import { UserError, dayToDate, fail, int, oneOf, text } from '../../../lib/formCheck'
import { dayKey } from '../../../lib/marketplace'
import { sendMail, siteUrl, teamInbox } from '../../../lib/marketplaceMail'
import { EVENT_TYPES, MARKET_AREAS, eventTypeLabel, rupees } from '../../../lib/marketplaceOptions'
import { getPayloadClient } from '../../../lib/payload'
import { normalizePhone } from '../../../lib/phoneVerification'
import { rateLimited } from '../../../lib/rateLimit'
import { getCustomer } from '../../../lib/session'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; login?: boolean }

const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))

/** Not logged in as a couple → `login: true`, so the UI can send them to log in. */
async function me(): Promise<Customer> {
  const customer = await getCustomer()
  if (!customer) {
    const err = new UserError('Log in to your Zenfest account first.')
    ;(err as UserError & { login?: boolean }).login = true
    throw err
  }
  return customer
}

const failWithLogin = (err: unknown) => ({
  ...fail(err),
  ...((err as { login?: boolean })?.login ? { login: true } : {}),
})

async function publishedVendor(slug: unknown): Promise<Vendor> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'vendors',
    where: { slug: { equals: text(slug, 80) }, listingStatus: { equals: 'published' } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  if (!docs[0]) throw new UserError('This vendor isn’t taking enquiries right now.')
  return docs[0] as Vendor
}

// ---------- profile ----------

export async function updateProfile(input: { name: string; phone: string; city: string; eventDate: string }): Promise<Result> {
  try {
    const customer = await me()
    const name = text(input.name, 120)
    const phone = normalizePhone(input.phone)
    if (name.length < 2) throw new UserError('Enter your name.')
    if (!phone) throw new UserError('Enter a valid 10-digit mobile number.')
    const eventDate = input.eventDate ? dayToDate(input.eventDate) : null
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'customers',
      id: customer.id,
      data: {
        name,
        phone,
        phoneVerified: phone === customer.phone ? customer.phoneVerified : false,
        city: text(input.city, 80) || null,
        eventDate: eventDate ? eventDate.toISOString() : null,
      },
      overrideAccess: true,
    })
    refresh()
    return { ok: true }
  } catch (err) {
    return failWithLogin(err)
  }
}

// ---------- shortlist ----------

export async function toggleShortlist(slug: string): Promise<Result<{ shortlisted: boolean }>> {
  try {
    const customer = await me()
    const vendor = await publishedVendor(slug)
    const current = (customer.shortlist ?? []).map(idOf)
    const has = current.includes(vendor.id)
    const shortlist = has ? current.filter((id) => id !== vendor.id) : [...current, vendor.id].slice(-100)
    const payload = await getPayloadClient()
    await payload.update({ collection: 'customers', id: customer.id, data: { shortlist }, overrideAccess: true })
    refresh()
    return { ok: true, shortlisted: !has }
  } catch (err) {
    return failWithLogin(err)
  }
}

// ---------- enquiries ----------

export type EnquiryInput = {
  vendorSlug: string
  eventType: string
  eventDate: string
  guests: string | number
  area: string
  budget: string | number
  message: string
}

const OPEN = ['new', 'replied', 'quoted']

export async function sendEnquiry(input: EnquiryInput): Promise<Result<{ id: number; existing?: boolean }>> {
  try {
    const customer = await me()
    const vendor = await publishedVendor(input.vendorSlug)
    const payload = await getPayloadClient()

    // One open conversation per couple and vendor.
    const open = await payload.find({
      collection: 'enquiries',
      where: { customer: { equals: customer.id }, vendor: { equals: vendor.id }, status: { in: OPEN } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    if (open.docs[0]) return { ok: true, id: open.docs[0].id, existing: true }

    const day = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recent = await payload.count({
      collection: 'enquiries',
      where: { customer: { equals: customer.id }, createdAt: { greater_than: day } },
      overrideAccess: true,
    })
    if (recent.totalDocs >= 20 || (await rateLimited('enquiry', 30, 60 * 60 * 1000))) {
      throw new UserError('You’ve sent a lot of enquiries today. Please try again tomorrow.')
    }

    const eventType = oneOf(EVENT_TYPES, input.eventType)
    const eventDate = input.eventDate ? dayToDate(input.eventDate) : null
    if (!eventType) throw new UserError('Choose the type of event.')
    if (input.eventDate && !eventDate) throw new UserError('Choose a valid date.')
    if (eventDate && eventDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      throw new UserError('That date has already passed.')
    }
    const guests = int(input.guests, 1, 100000)
    const budget = int(input.budget, 0, 10_00_00_000)
    const area = MARKET_AREAS.includes(input.area) ? input.area : text(input.area, 80)
    const message = text(input.message, 2000)
    if (message.length < 10) throw new UserError('Tell the vendor a little about what you need.')

    const blocked = eventDate && (vendor.blockedDates ?? []).some((b) => dayKey(b.date) === dayKey(eventDate))
    const when = eventDate ? dayKey(eventDate) : 'date not fixed'
    const enquiry = await payload.create({
      collection: 'enquiries',
      data: {
        summary: `${customer.name} → ${vendor.businessName} · ${eventTypeLabel(eventType)} · ${when}`,
        customer: customer.id,
        vendor: vendor.id,
        eventType,
        eventDate: eventDate?.toISOString(),
        guests,
        area: area || undefined,
        budget,
        message,
        status: 'new',
        unreadFor: 'vendor',
        thread: [],
      },
      overrideAccess: true,
    })

    const shortlist = (customer.shortlist ?? []).map(idOf)
    if (!shortlist.includes(vendor.id)) {
      await payload.update({
        collection: 'customers',
        id: customer.id,
        data: { shortlist: [...shortlist, vendor.id].slice(-100) },
        overrideAccess: true,
      })
    }

    const details = [
      `Event: ${eventTypeLabel(eventType)} on ${when}${blocked ? ' (you marked this date unavailable)' : ''}`,
      guests ? `Guests: ${guests}` : '',
      area ? `Area: ${area}` : '',
      budget ? `Budget: ${rupees(budget)}` : '',
      '',
      message,
    ].filter((l, i, a) => l || a[i - 1])
    await sendMail(vendor.email, `New enquiry from ${customer.name}`, [
      `Hi ${vendor.name},`,
      '',
      `${customer.name} sent you an enquiry on the Zenfest marketplace.`,
      ...details,
      '',
      `Reply from your dashboard: ${siteUrl()}/vendors/dashboard?tab=enquiries`,
    ])
    await sendMail(teamInbox(), `Marketplace enquiry: ${customer.name} → ${vendor.businessName}`, [
      `${customer.name} (${customer.phone}, ${customer.email}) → ${vendor.businessName} (${vendor.phone})`,
      ...details,
    ])
    refresh()
    return { ok: true, id: enquiry.id }
  } catch (err) {
    return failWithLogin(err)
  }
}

async function ownEnquiry(customerId: number, id: unknown) {
  const payload = await getPayloadClient()
  const enquiry = await payload
    .findByID({ collection: 'enquiries', id: Number(id), depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!enquiry || idOf(enquiry.customer) !== customerId) throw new UserError('Enquiry not found.')
  return enquiry
}

export async function replyAsCustomer(input: { id: number; text: string }): Promise<Result> {
  try {
    const customer = await me()
    const enquiry = await ownEnquiry(customer.id, input.id)
    const body = text(input.text, 2000)
    if (!body) throw new UserError('Write a message first.')
    if ((enquiry.thread ?? []).length >= 100) throw new UserError('This conversation is full — call the vendor instead.')
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'enquiries',
      id: enquiry.id,
      data: {
        thread: [...(enquiry.thread ?? []), { from: 'customer', text: body, at: new Date().toISOString() }],
        unreadFor: 'vendor',
      },
      overrideAccess: true,
    })
    const vendor = typeof enquiry.vendor === 'object' ? enquiry.vendor : null
    await sendMail(vendor?.email, `${customer.name} sent you a message`, [
      `${customer.name} wrote:`,
      '',
      body,
      '',
      `Reply from your dashboard: ${siteUrl()}/vendors/dashboard?tab=enquiries`,
    ])
    refresh()
    return { ok: true }
  } catch (err) {
    return failWithLogin(err)
  }
}

export async function closeEnquiry(id: number): Promise<Result> {
  try {
    const customer = await me()
    const enquiry = await ownEnquiry(customer.id, id)
    const payload = await getPayloadClient()
    await payload.update({ collection: 'enquiries', id: enquiry.id, data: { status: 'closed' }, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return failWithLogin(err)
  }
}

export async function markRead(id: number): Promise<Result> {
  try {
    const customer = await me()
    const enquiry = await ownEnquiry(customer.id, id)
    if (enquiry.unreadFor === 'customer') {
      const payload = await getPayloadClient()
      await payload.update({ collection: 'enquiries', id: enquiry.id, data: { unreadFor: null }, overrideAccess: true })
    }
    return { ok: true }
  } catch (err) {
    return failWithLogin(err)
  }
}

// ---------- hand the plan to Zenfest ----------

/** Leads' event types are narrower than the marketplace's. */
const leadEventType = (v: string | null | undefined) =>
  v === 'engagement' || v === 'reception' ? 'wedding' : v === 'birthday' || v === 'housewarming' || v === 'corporate' || v === 'wedding' ? v : 'other'

/** The planner lane: turns the couple's shortlist and enquiries into a Lead for the team. */
export async function handToZenfest(input: { note: string }): Promise<Result> {
  try {
    const customer = await me()
    if (await rateLimited('handoff', 5, 24 * 60 * 60 * 1000)) {
      throw new UserError('We already have your request — our team will call you soon.')
    }
    const payload = await getPayloadClient()
    const shortlist = (customer.shortlist ?? []).map(idOf)
    const [vendors, enquiries] = await Promise.all([
      shortlist.length
        ? payload.find({ collection: 'vendors', where: { id: { in: shortlist } }, depth: 0, limit: 100, overrideAccess: true })
        : Promise.resolve({ docs: [] as Vendor[] }),
      payload.find({
        collection: 'enquiries',
        where: { customer: { equals: customer.id } },
        depth: 1,
        limit: 50,
        sort: '-updatedAt',
        overrideAccess: true,
      }),
    ])
    const latest = enquiries.docs[0]
    const note = text(input.note, 2000)
    await payload.create({
      collection: 'leads',
      data: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        eventType: leadEventType(latest?.eventType),
        eventDate: latest?.eventDate ?? customer.eventDate ?? undefined,
        message: [
          'Wants Zenfest to plan it (handed over from their marketplace account).',
          note ? `Note: ${note}` : '',
          customer.city ? `Area: ${customer.city}` : '',
          vendors.docs.length ? `Shortlisted: ${(vendors.docs as Vendor[]).map((v) => v.businessName).join(', ')}` : '',
          ...enquiries.docs.map((e) => {
            const v = typeof e.vendor === 'object' ? e.vendor : null
            return `Enquiry → ${v?.businessName ?? 'vendor'}: ${eventTypeLabel(e.eventType)}${
              e.eventDate ? ` on ${dayKey(e.eventDate)}` : ''
            }${e.guests ? `, ${e.guests} guests` : ''}${e.budget ? `, budget ${rupees(e.budget)}` : ''} (${e.status})`
          }),
        ]
          .filter(Boolean)
          .join('\n'),
        source: 'marketplace',
      },
      overrideAccess: true,
    })
    return { ok: true }
  } catch (err) {
    return failWithLogin(err)
  }
}
