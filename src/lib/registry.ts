// Server-only gift-registry data access. Never import this from a client
// component — it pulls in the Payload client (see CLAUDE.md).
//
// Every read here uses the Local API (which bypasses collection access), so this
// file is the privacy boundary: guests get `PublicItem`s with no claimer
// details, and the host sees claimers only when `revealClaims` is on.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import type { RegistryClaim, RegistryEvent, RegistryGuest, RegistryItem } from '../payload-types'
import { getPayloadClient } from './payload'
import { canSeeResults, getResults, listEventPolls, type PollResults, type PublicPoll } from './polls'

export type PublicEvent = Pick<
  RegistryEvent,
  | 'id'
  | 'slug'
  | 'title'
  | 'eventType'
  | 'hostNames'
  | 'eventDate'
  | 'venueName'
  | 'venueCity'
  | 'venueMapUrl'
  | 'welcomeNote'
  | 'upiId'
  | 'upiName'
>

export type PublicItem = {
  id: number
  itemType: RegistryItem['itemType']
  title: string
  price: number | null
  imageUrl: string
  merchant: string
  note: string
  hasLink: boolean
  targetAmount: number | null
  raisedAmount: number
  claimed: boolean
}

export type HostItem = PublicItem & {
  originalUrl: string
  /** Only present when the host has turned on reveal mode. */
  claim?: { guestName: string; message: string; mode: string; at: string }
}

export type HostGuest = Pick<RegistryGuest, 'id' | 'name' | 'phone' | 'side' | 'count' | 'rsvp' | 'invitedAt'>

// ---------- secrets (manage keys, claim undo tokens) ----------

export const generateSecret = (bytes = 18) => randomBytes(bytes).toString('base64url')

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(secret, salt, 32).toString('hex')}`
}

export function verifySecret(secret: string | null | undefined, stored: string | null | undefined): boolean {
  if (!secret || !stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(secret, salt, 32)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// ---------- loading ----------

export async function findEvent(slug: string): Promise<RegistryEvent | null> {
  if (!slug || slug.length > 60) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'registry-events',
    where: { slug: { equals: slug.toLowerCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return docs[0] ?? null
}

/** The event, if `key` is its manage key. */
export async function findEventForHost(slug: string, key: string | null | undefined) {
  const event = await findEvent(slug)
  if (!event || !verifySecret(key, event.manageKeyHash)) return null
  return event
}

export function toPublicEvent(e: RegistryEvent): PublicEvent {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    eventType: e.eventType,
    hostNames: e.hostNames,
    eventDate: e.eventDate,
    venueName: e.venueName,
    venueCity: e.venueCity,
    venueMapUrl: e.venueMapUrl,
    welcomeNote: e.welcomeNote,
    upiId: e.upiId,
    upiName: e.upiName,
  }
}

async function loadItemsAndClaims(eventId: number) {
  const payload = await getPayloadClient()
  const [items, claims] = await Promise.all([
    payload.find({
      collection: 'registry-items',
      where: { event: { equals: eventId } },
      sort: ['sortOrder', 'createdAt'],
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'registry-claims',
      where: { event: { equals: eventId } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const claimByItem = new Map<number, RegistryClaim>()
  for (const c of claims.docs) {
    const id = typeof c.item === 'object' ? c.item.id : c.item
    claimByItem.set(id, c)
  }
  return { items: items.docs, claimByItem }
}

function toPublicItem(item: RegistryItem, claimed: boolean): PublicItem {
  return {
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    price: item.price ?? null,
    imageUrl: item.imageUrl || '',
    merchant: item.merchant || '',
    note: item.note || '',
    hasLink: Boolean(item.originalUrl),
    targetAmount: item.targetAmount ?? null,
    raisedAmount: item.raisedAmount ?? 0,
    claimed,
  }
}

/** What a guest may see. Hidden registries look like they don't exist. */
export async function getPublicRegistry(slug: string) {
  const event = await findEvent(slug)
  if (!event || event.status === 'hidden') return null
  const [{ items, claimByItem }, polls] = await Promise.all([loadItemsAndClaims(event.id), loadEventPolls(event.id, false)])
  return {
    event: toPublicEvent(event),
    items: items.map((i) => toPublicItem(i, claimByItem.has(i.id))),
    polls,
  }
}

/** What the host may see: claimers only in reveal mode, plus the guest list. */
export async function getHostRegistry(event: RegistryEvent) {
  const payload = await getPayloadClient()
  const [{ items, claimByItem }, guests, polls] = await Promise.all([
    loadItemsAndClaims(event.id),
    payload.find({
      collection: 'registry-guests',
      where: { event: { equals: event.id } },
      sort: 'name',
      limit: 2000,
      depth: 0,
      overrideAccess: true,
    }),
    loadEventPolls(event.id, true),
  ])
  const reveal = Boolean(event.revealClaims)
  const hostItems: HostItem[] = items.map((i) => {
    const claim = claimByItem.get(i.id)
    return {
      ...toPublicItem(i, Boolean(claim)),
      originalUrl: i.originalUrl || '',
      ...(reveal && claim
        ? {
            claim: {
              guestName: claim.guestName,
              message: claim.message || '',
              mode: claim.mode || 'online',
              at: claim.createdAt,
            },
          }
        : {}),
    }
  })
  return {
    event: {
      ...toPublicEvent(event),
      hostName: event.hostName,
      hostPhone: event.hostPhone,
      hostEmail: event.hostEmail || '',
      revealClaims: reveal,
    },
    items: hostItems,
    polls,
    guests: guests.docs.map(
      (g): HostGuest => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        side: g.side,
        count: g.count,
        rsvp: g.rsvp,
        invitedAt: g.invitedAt,
      }),
    ),
  }
}

export type EventPollView = { poll: PublicPoll; results: PollResults | null }

/**
 * A registry's polls with results. Guests' votes live in their browser, so the
 * server can't tell who voted: results go out unless the host chose "after the
 * poll closes", and VoteCard only shows them once this browser has voted.
 */
async function loadEventPolls(eventId: number, isHost: boolean): Promise<EventPollView[]> {
  const polls = await listEventPolls(eventId)
  return Promise.all(
    polls.map(async (poll) => ({
      poll,
      results:
        isHost || poll.resultsVisibility !== 'after-close' || canSeeResults(poll, false) ? await getResults(poll) : null,
    })),
  )
}

export type HostRegistry = Awaited<ReturnType<typeof getHostRegistry>>

/** Absolute site URL for links we send (WhatsApp, email). */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
