'use server'

// Gift-registry Server Actions. They are public POST endpoints, so every host
// action checks the manage key itself and every guest action re-checks the item
// belongs to that registry. Reads/writes use the Local API (overrideAccess).
import { refresh } from 'next/cache'

import { getPayloadClient } from '../../../lib/payload'
import { rateLimited } from '../../../lib/rateLimit'
import {
  findEvent,
  findEventForHost,
  generateSecret,
  hashSecret,
  siteUrl,
  verifySecret,
} from '../../../lib/registry'
import { scrapeMetadata, type LinkPreview } from '../../../lib/scrapeMetadata'
import {
  GUEST_SIDES,
  ITEM_TYPES,
  REGISTRY_EVENT_TYPES,
  RSVP_OPTIONS,
  SLUG_PATTERN,
  detectMerchant,
} from '../../../lib/registryOptions'
import { RESULTS_VISIBILITY } from '../../../lib/pollOptions'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const UNDO_WINDOW_MS = 30 * 60 * 1000

// ---------- small validators ----------

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf = <T extends readonly (readonly [string, string])[]>(list: T, v: unknown) =>
  list.some(([value]) => value === v) ? (v as T[number][0]) : undefined
const amount = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 && n <= 1_00_00_000 ? n : null
}
const webUrl = (v: unknown, httpsOnly = false) => {
  const s = text(v, 2000)
  if (!s) return ''
  try {
    const u = new URL(s)
    if (u.protocol === 'https:' || (!httpsOnly && u.protocol === 'http:')) return u.toString()
  } catch {}
  return null
}
const phoneOk = (v: string) => {
  const d = v.replace(/\D/g, '')
  return d.length >= 10 && d.length <= 13
}

async function hostEvent(slug: string, key: string) {
  const event = await findEventForHost(slug, key)
  if (!event) throw new Error('This manage link is not valid.')
  return event
}

async function ownedItem(eventId: number, itemId: unknown) {
  const payload = await getPayloadClient()
  const id = Number(itemId)
  if (!Number.isInteger(id)) return null
  const item = await payload
    .findByID({ collection: 'registry-items', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  const owner = item && (typeof item.event === 'object' ? item.event.id : item.event)
  return item && owner === eventId ? item : null
}

const fail = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
})

// ---------- create a registry ----------

export async function checkSlug(slug: string): Promise<{ available: boolean }> {
  const s = text(slug, 40).toLowerCase()
  if (!SLUG_PATTERN.test(s)) return { available: false }
  return { available: !(await findEvent(s)) }
}

export type CreateRegistryInput = {
  title: string
  eventType: string
  hostNames: string
  eventDate: string
  venueName: string
  venueCity: string
  venueMapUrl: string
  welcomeNote: string
  hostName: string
  hostPhone: string
  hostEmail: string
  slug: string
  company?: string // honeypot
}

export async function createRegistry(
  input: CreateRegistryInput,
): Promise<Result<{ slug: string; key: string }>> {
  try {
    if (text(input.company, 100)) return { ok: false, error: 'Please try again.' }
    if (await rateLimited('create', 8, 60 * 60 * 1000)) {
      return { ok: false, error: 'Too many registries from this connection. Please try later.' }
    }

    const slug = text(input.slug, 40).toLowerCase()
    const title = text(input.title, 120)
    const eventType = oneOf(REGISTRY_EVENT_TYPES, input.eventType)
    const hostName = text(input.hostName, 120)
    const hostPhone = text(input.hostPhone, 20)
    const hostEmail = text(input.hostEmail, 200)
    const date = new Date(input.eventDate)
    const venueMapUrl = webUrl(input.venueMapUrl)

    if (!SLUG_PATTERN.test(slug)) return { ok: false, error: 'Choose a page address of 3–40 letters, numbers or hyphens.' }
    if (!title) return { ok: false, error: 'Give your registry a title.' }
    if (!eventType) return { ok: false, error: 'Choose the occasion.' }
    if (Number.isNaN(date.getTime())) return { ok: false, error: 'Choose the event date.' }
    if (!hostName || !phoneOk(hostPhone)) return { ok: false, error: 'Add your name and a valid phone number.' }
    if (hostEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostEmail)) return { ok: false, error: 'That email address looks wrong.' }
    if (venueMapUrl === null) return { ok: false, error: 'The map link should start with https://' }
    if (await findEvent(slug)) return { ok: false, error: 'That page address is taken — try another.' }

    const key = generateSecret()
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'registry-events',
      overrideAccess: true,
      data: {
        slug,
        title,
        eventType,
        hostNames: text(input.hostNames, 120),
        eventDate: date.toISOString(),
        venueName: text(input.venueName, 160),
        venueCity: text(input.venueCity, 80),
        venueMapUrl: venueMapUrl || '',
        welcomeNote: text(input.welcomeNote, 800),
        hostName,
        hostPhone,
        hostEmail: hostEmail || undefined,
        manageKeyHash: hashSecret(key),
      },
    })

    if (hostEmail) {
      const manage = `${siteUrl()}/dashboard/${slug}?key=${key}`
      await payload
        .sendEmail({
          to: hostEmail,
          subject: `Your gift registry is ready — ${title}`,
          text:
            `Hi ${hostName},\n\nYour Zenfest gift registry "${title}" is live.\n\n` +
            `Share with guests:\n${siteUrl()}/r/${slug}\n\n` +
            `Manage it (keep this link private — anyone with it can edit your registry):\n${manage}\n\n` +
            `Planning the celebration itself? Reply to this email or WhatsApp us — we'd love to help.\n\n— Zenfest Events`,
        })
        .catch((err: unknown) =>
          payload.logger.warn(`[registry] Could not email manage link: ${err instanceof Error ? err.message : err}`),
        )
    }

    return { ok: true, slug, key }
  } catch (err) {
    return fail(err)
  }
}

// ---------- host: gifts ----------

export async function previewLink(slug: string, key: string, url: string): Promise<Result<{ preview: LinkPreview }>> {
  try {
    await hostEvent(slug, key)
    const clean = webUrl(url)
    if (!clean) return { ok: false, error: 'Paste a full product link, starting with https://' }
    return { ok: true, preview: await scrapeMetadata(clean) }
  } catch (err) {
    return fail(err)
  }
}

export type ItemInput = {
  id?: number
  itemType: string
  title: string
  price?: number | string | null
  imageUrl?: string
  originalUrl?: string
  note?: string
  targetAmount?: number | string | null
  raisedAmount?: number | string | null
}

export async function saveItem(slug: string, key: string, input: ItemInput): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    const payload = await getPayloadClient()

    const itemType = oneOf(ITEM_TYPES, input.itemType)
    const title = text(input.title, 160)
    const imageUrl = webUrl(input.imageUrl, true)
    const originalUrl = webUrl(input.originalUrl)
    if (!itemType) return { ok: false, error: 'Choose a gift type.' }
    if (!title) return { ok: false, error: 'Give the gift a name.' }
    if (imageUrl === null) return { ok: false, error: 'The image link must start with https://' }
    if (originalUrl === null) return { ok: false, error: 'The product link must start with https://' }
    if (itemType === 'affiliate_link' && !originalUrl) return { ok: false, error: 'Add the product link.' }

    const data = {
      itemType,
      title,
      price: itemType === 'cash_fund' ? null : amount(input.price),
      imageUrl: imageUrl || '',
      originalUrl: itemType === 'cash_fund' ? '' : originalUrl || '',
      merchant: originalUrl ? detectMerchant(originalUrl) : '',
      note: text(input.note, 600),
      targetAmount: itemType === 'cash_fund' ? amount(input.targetAmount) : null,
      raisedAmount: itemType === 'cash_fund' ? amount(input.raisedAmount) ?? 0 : 0,
    }

    if (input.id) {
      if (!(await ownedItem(event.id, input.id))) return { ok: false, error: 'Gift not found.' }
      await payload.update({ collection: 'registry-items', id: input.id, data, overrideAccess: true })
    } else {
      const { totalDocs } = await payload.count({
        collection: 'registry-items',
        where: { event: { equals: event.id } },
        overrideAccess: true,
      })
      if (totalDocs >= 300) return { ok: false, error: 'A registry can hold up to 300 gifts.' }
      await payload.create({
        collection: 'registry-items',
        data: { ...data, event: event.id, sortOrder: totalDocs },
        overrideAccess: true,
      })
    }
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteItem(slug: string, key: string, itemId: number): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    if (!(await ownedItem(event.id, itemId))) return { ok: false, error: 'Gift not found.' }
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'registry-claims', where: { item: { equals: itemId } }, overrideAccess: true })
    await payload.delete({ collection: 'registry-items', id: itemId, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Saves a new display order: `ids` is every gift, top to bottom. */
export async function reorderItems(slug: string, key: string, ids: number[]): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    const payload = await getPayloadClient()
    await Promise.all(
      ids.slice(0, 300).map((id, sortOrder) =>
        payload.update({
          collection: 'registry-items',
          where: { and: [{ id: { equals: id } }, { event: { equals: event.id } }] },
          data: { sortOrder },
          overrideAccess: true,
        }),
      ),
    )
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Host frees a claimed gift (e.g. the guest said they can't buy it after all). */
export async function releaseClaim(slug: string, key: string, itemId: number): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    if (!(await ownedItem(event.id, itemId))) return { ok: false, error: 'Gift not found.' }
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'registry-claims', where: { item: { equals: itemId } }, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- host: event settings ----------

export type EventSettingsInput = Partial<
  Pick<
    CreateRegistryInput,
    'title' | 'hostNames' | 'eventDate' | 'venueName' | 'venueCity' | 'venueMapUrl' | 'welcomeNote' | 'hostEmail'
  > & { upiId: string; upiName: string; revealClaims: boolean }
>

export async function updateEventSettings(slug: string, key: string, input: EventSettingsInput): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    const data: Record<string, unknown> = {}
    if (input.title !== undefined) {
      const title = text(input.title, 120)
      if (!title) return { ok: false, error: 'The registry needs a title.' }
      data.title = title
    }
    for (const f of ['hostNames', 'venueName', 'venueCity', 'upiName'] as const) {
      if (input[f] !== undefined) data[f] = text(input[f], 160)
    }
    if (input.welcomeNote !== undefined) data.welcomeNote = text(input.welcomeNote, 800)
    if (input.eventDate !== undefined) {
      const d = new Date(input.eventDate)
      if (Number.isNaN(d.getTime())) return { ok: false, error: 'Choose a valid date.' }
      data.eventDate = d.toISOString()
    }
    if (input.venueMapUrl !== undefined) {
      const u = webUrl(input.venueMapUrl)
      if (u === null) return { ok: false, error: 'The map link should start with https://' }
      data.venueMapUrl = u
    }
    if (input.upiId !== undefined) {
      const upi = text(input.upiId, 80)
      if (upi && !/^[\w.-]{2,}@[a-zA-Z][\w.-]{1,}$/.test(upi)) return { ok: false, error: 'That UPI ID looks wrong (e.g. name@okhdfcbank).' }
      data.upiId = upi
    }
    if (input.hostEmail !== undefined) {
      const email = text(input.hostEmail, 200)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'That email address looks wrong.' }
      data.hostEmail = email || null
    }
    if (input.revealClaims !== undefined) data.revealClaims = Boolean(input.revealClaims)

    const payload = await getPayloadClient()
    await payload.update({ collection: 'registry-events', id: event.id, data, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- host: guest list & RSVP ----------

export type GuestInput = { name: string; phone?: string; side?: string; count?: number | string }

export async function addGuests(slug: string, key: string, rows: GuestInput[]): Promise<Result<{ added: number }>> {
  try {
    const event = await hostEvent(slug, key)
    const payload = await getPayloadClient()
    const clean = rows
      .slice(0, 500)
      .map((r) => ({
        name: text(r.name, 120),
        phone: text(r.phone, 20),
        side: oneOf(GUEST_SIDES, r.side),
        count: Math.min(Math.max(Math.round(Number(r.count) || 1), 1), 50),
      }))
      .filter((r) => r.name)
    for (const r of clean) {
      await payload.create({
        collection: 'registry-guests',
        data: { ...r, event: event.id, rsvp: 'pending' },
        overrideAccess: true,
      })
    }
    refresh()
    return { ok: true, added: clean.length }
  } catch (err) {
    return fail(err)
  }
}

export async function updateGuest(
  slug: string,
  key: string,
  guestId: number,
  patch: { rsvp?: string; invited?: boolean; count?: number },
): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    const data: Record<string, unknown> = {}
    if (patch.rsvp !== undefined) {
      const rsvp = oneOf(RSVP_OPTIONS, patch.rsvp)
      if (!rsvp) return { ok: false, error: 'Unknown RSVP status.' }
      data.rsvp = rsvp
    }
    if (patch.invited) data.invitedAt = new Date().toISOString()
    if (patch.count !== undefined) data.count = Math.min(Math.max(Math.round(Number(patch.count) || 1), 1), 50)

    const payload = await getPayloadClient()
    await payload.update({
      collection: 'registry-guests',
      where: { and: [{ id: { equals: guestId } }, { event: { equals: event.id } }] },
      data,
      overrideAccess: true,
    })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteGuest(slug: string, key: string, guestId: number): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    const payload = await getPayloadClient()
    await payload.delete({
      collection: 'registry-guests',
      where: { and: [{ id: { equals: guestId } }, { event: { equals: event.id } }] },
      overrideAccess: true,
    })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- guest: claim a gift ----------

export type ClaimInput = { guestName: string; message?: string; mode?: 'online' | 'offline'; company?: string }

/**
 * Claims a gift for a guest. Duplicate-proof: `registry-claims.item` is unique,
 * so if two guests race, the database keeps exactly one claim and the other
 * gets `taken`. Returns an undo token the guest's browser keeps for a while.
 */
export async function claimItem(
  slug: string,
  itemId: number,
  input: ClaimInput,
): Promise<Result<{ undoToken: string; goUrl: string | null }> | { ok: false; error: string; taken: true }> {
  try {
    if (text(input.company, 100)) return { ok: false, error: 'Please try again.' }
    if (await rateLimited('claim', 12, 10 * 60 * 1000)) {
      return { ok: false, error: 'Too many claims from this connection. Please wait a few minutes.' }
    }
    const guestName = text(input.guestName, 80)
    if (!guestName) return { ok: false, error: 'Please add your name so the family knows.' }

    const event = await findEvent(slug)
    if (!event || event.status === 'hidden') return { ok: false, error: 'This registry is no longer available.' }
    const item = await ownedItem(event.id, itemId)
    if (!item || item.itemType === 'cash_fund') return { ok: false, error: 'Gift not found.' }

    const payload = await getPayloadClient()
    const undoToken = generateSecret()
    try {
      await payload.create({
        collection: 'registry-claims',
        overrideAccess: true,
        data: {
          item: item.id,
          event: event.id,
          guestName,
          message: text(input.message, 600),
          mode: input.mode === 'offline' || !item.originalUrl ? 'offline' : 'online',
          undoTokenHash: hashSecret(undoToken),
        },
      })
    } catch (err) {
      // Unique index on `item` rejected it — someone got there first.
      const existing = await payload.count({
        collection: 'registry-claims',
        where: { item: { equals: item.id } },
        overrideAccess: true,
      })
      if (existing.totalDocs > 0) {
        refresh()
        return { ok: false, taken: true, error: 'Someone has just claimed this gift. Please pick another one.' }
      }
      throw err
    }

    refresh()
    const goUrl = item.originalUrl && input.mode !== 'offline' ? `/r/${event.slug}/go/${item.id}` : null
    return { ok: true, undoToken, goUrl }
  } catch (err) {
    return fail(err)
  }
}

/** A guest takes back their own claim, from the same browser, within 30 minutes. */
export async function undoClaim(slug: string, itemId: number, undoToken: string): Promise<Result> {
  try {
    const event = await findEvent(slug)
    if (!event) return { ok: false, error: 'Registry not found.' }
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'registry-claims',
      where: { and: [{ item: { equals: itemId } }, { event: { equals: event.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
    const claim = docs[0]
    if (!claim || !verifySecret(undoToken, claim.undoTokenHash)) {
      return { ok: false, error: 'This claim can’t be undone from here — please tell the family.' }
    }
    if (Date.now() - new Date(claim.createdAt).getTime() > UNDO_WINDOW_MS) {
      return { ok: false, error: 'It’s been a while — please ask the family to free this gift.' }
    }
    await payload.delete({ collection: 'registry-claims', id: claim.id, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// ---------- host: event polls ----------

export type EventPollInput = { question: string; options: string[]; resultsVisibility?: string }

/** A family's own poll for their guests ("Sangeet colour theme?"), shown on the registry. */
export async function createEventPoll(slug: string, key: string, input: EventPollInput): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    const question = text(input.question, 200)
    const options = (input.options || []).map((o) => text(o, 120)).filter(Boolean).slice(0, 6)
    if (!question) return { ok: false, error: 'Write your question.' }
    if (options.length < 2) return { ok: false, error: 'Add at least two options.' }
    const resultsVisibility = oneOf(RESULTS_VISIBILITY, input.resultsVisibility) ?? 'after-vote'

    const payload = await getPayloadClient()
    const { totalDocs } = await payload.count({
      collection: 'polls',
      where: { registryEvent: { equals: event.id } },
      overrideAccess: true,
    })
    if (totalDocs >= 20) return { ok: false, error: 'A registry can have up to 20 polls.' }

    await payload.create({
      collection: 'polls',
      overrideAccess: true,
      data: {
        question,
        category: 'event',
        options: options.map((label) => ({ label })),
        status: 'open',
        resultsVisibility,
        requireVerified: false,
        registryEvent: event.id,
      },
    })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

async function ownedPoll(eventId: number, pollId: number) {
  const payload = await getPayloadClient()
  const poll = await payload
    .findByID({ collection: 'polls', id: pollId, depth: 0, overrideAccess: true })
    .catch(() => null)
  const owner = poll?.registryEvent && (typeof poll.registryEvent === 'object' ? poll.registryEvent.id : poll.registryEvent)
  return poll && owner === eventId ? poll : null
}

export async function setEventPollStatus(slug: string, key: string, pollId: number, status: 'open' | 'closed'): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    if (!(await ownedPoll(event.id, pollId))) return { ok: false, error: 'Poll not found.' }
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'polls',
      id: pollId,
      data: { status: status === 'closed' ? 'closed' : 'open', closesAt: null },
      overrideAccess: true,
    })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteEventPoll(slug: string, key: string, pollId: number): Promise<Result> {
  try {
    const event = await hostEvent(slug, key)
    if (!(await ownedPoll(event.id, pollId))) return { ok: false, error: 'Poll not found.' }
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'poll-votes', where: { poll: { equals: pollId } }, overrideAccess: true })
    await payload.delete({ collection: 'polls', id: pollId, overrideAccess: true })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}
