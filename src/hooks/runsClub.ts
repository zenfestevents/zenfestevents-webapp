// Runs club award hooks (lib/rewards.ts). Every award is idempotent (unique index
// on the runs row), so these may fire more than once. They skip when
// `context.skipRuns` is set — the award code's own account updates — so they
// can't loop, and an award failure is logged, never thrown into the save.
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { normalizePhone } from '../lib/phoneVerification'
import {
  awardQuietly,
  awardReferralSignup,
  awardReferralVendor,
  findReferrer,
  kindOfCollection,
  newReferralCode,
  refCodeFromCookies,
} from '../lib/rewards'
import { accountKey } from '../lib/rewardTiers'

type Rel = number | string | { id: number | string } | null | undefined
const relId = (value: Rel) => (value && typeof value === 'object' ? value.id : value) || null
const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '')

/** Customers + Vendors: an 8-character share code on every new account. */
export const assignReferralCode: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === 'create' && !data.referralCode) data.referralCode = newReferralCode()
  return data
}

/** Customers: `profile` once name, city and event date are all filled. */
export const customerRuns: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context.skipRuns) return doc
  if (filled(doc.name) && filled(doc.city) && filled(doc.eventDate)) {
    await awardQuietly(req.payload, { kind: 'c', id: doc.id, reason: 'profile', source: 'account', req })
  }
  return doc
}

/** Vendors: `profile` once business name, category and areas are filled; `listing_live` when it goes Live. */
export const vendorRuns: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context.skipRuns) return doc
  if (filled(doc.businessName) && filled(doc.category) && filled(doc.areas)) {
    await awardQuietly(req.payload, { kind: 'v', id: doc.id, reason: 'profile', source: 'account', req })
  }
  if (doc.listingStatus === 'published' && previousDoc?.listingStatus !== 'published') {
    await awardQuietly(req.payload, { kind: 'v', id: doc.id, reason: 'listing_live', source: 'account', req })
    // Whoever invited this vendor: the big vendor-invite award (once per vendor's phone).
    if (doc.referredBy) await awardReferralVendor(req.payload, doc.referredBy, doc.phone, req)
  }
  return doc
}

/**
 * Leads, on create: `customer` comes only from the session (a logged-in couple),
 * `referredBy` only from the httpOnly `zf_ref` cookie set by /invite/<code> — never
 * from the request body. A code that is the submitter's own account or phone
 * number is ignored.
 */
export const stampLeadAccounts: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  delete data.customer
  delete data.referredBy

  const user = req.user as { id: number | string; collection?: string; phone?: string | null } | null | undefined
  const userKind = kindOfCollection(user?.collection)
  if (user && userKind === 'c') data.customer = user.id

  const code = refCodeFromCookies(req.headers?.get?.('cookie'))
  const referrer = code ? await findReferrer(req.payload, code, req).catch(() => null) : null
  if (referrer) {
    const ownAccount = user && userKind ? referrer.key === accountKey(userKind, user.id) : false
    const phones = [normalizePhone(data.phone), normalizePhone(user?.phone)].filter(Boolean)
    const ownPhone = Boolean(referrer.phone && phones.includes(referrer.phone))
    if (!ownAccount && !ownPhone) data.referredBy = referrer.key
    return data
  }
  // No invite cookie (it lasts 60 days): a couple who joined through an invite still
  // credits whoever invited them, for as long as they have the account.
  if (user && userKind === 'c') {
    const account = (await req.payload
      .findByID({ collection: 'customers', id: user.id, depth: 0, select: { referredBy: true }, overrideAccess: true, req })
      .catch(() => null)) as { referredBy?: string | null } | null
    if (account?.referredBy) data.referredBy = account.referredBy
  }
  return data
}

/**
 * Partner applications (/vendors/partner), on create: who invited this vendor, from the
 * /invite/<code> cookie only — never the request body. Own code / own phone doesn't
 * count. Runs before requireVerifiedPhone (which must stay last).
 */
export const stampApplicationReferral: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  delete data.referredBy
  const code = refCodeFromCookies(req.headers?.get?.('cookie'))
  if (!code) return data
  const referrer = await findReferrer(req.payload, code, req).catch(() => null)
  if (!referrer) return data
  const user = req.user as { id: number | string; collection?: string; phone?: string | null } | null | undefined
  const userKind = kindOfCollection(user?.collection)
  const ownAccount = user && userKind ? referrer.key === accountKey(userKind, user.id) : false
  const phones = [normalizePhone(data.phone), normalizePhone(user?.phone)].filter(Boolean)
  if (!ownAccount && !(referrer.phone && phones.includes(referrer.phone))) data.referredBy = referrer.key
  return data
}

/** Partner applications: the small invite award when it arrives, the big one when staff approve it. */
export const applicationRuns: CollectionAfterChangeHook = async ({ data, doc, previousDoc, operation, req, context }) => {
  if (context.skipRuns) return doc
  const referredBy = doc.referredBy ?? data?.referredBy
  if (!referredBy) return doc
  const phone = doc.phone ?? data?.phone
  if (operation === 'create') await awardReferralSignup(req.payload, referredBy, phone, req)
  // Only on an update: the public create can't make itself "approved" and pay out.
  if (operation === 'update' && doc.status === 'approved' && previousDoc?.status !== 'approved') {
    await awardReferralVendor(req.payload, referredBy, phone, req)
  }
  return doc
}

/**
 * Leads: `enquiry` for the couple's first enquiry (once per account), then when
 * staff set the status to Booked, `booking` for the couple and `referral` for
 * whoever referred it — both once per lead.
 */
export const leadRuns: CollectionAfterChangeHook = async ({ data, doc, previousDoc, operation, req, context }) => {
  if (context.skipRuns) return doc
  const { payload } = req
  // `doc` has been through afterRead, which hides these admin-only fields from the
  // couple whose REST create this is; `data` still has what stampLeadAccounts set.
  const customer = relId(doc.customer ?? data?.customer)
  const referredBy = doc.referredBy ?? data?.referredBy
  if (operation === 'create' && customer) {
    await awardQuietly(payload, { kind: 'c', id: customer, reason: 'enquiry', source: 'account', req })
  }
  // An enquiry from someone who was invited: the inviter's small award (once per phone, capped).
  if (operation === 'create' && referredBy) await awardReferralSignup(payload, referredBy, doc.phone ?? data?.phone, req)
  if (doc.status === 'booked' && previousDoc?.status !== 'booked') {
    const source = `lead:${doc.id}`
    if (customer) await awardQuietly(payload, { kind: 'c', id: customer, reason: 'booking', source, req })
    const m = /^([cv]):(\d+)$/.exec(String(referredBy ?? ''))
    if (m) {
      await awardQuietly(payload, { kind: m[1] as 'c' | 'v', id: Number(m[2]), reason: 'referral', source, req })
    }
  }
  return doc
}

/** Marketplace enquiries: `vendor_reply` on the vendor's first reply, `vendor_booking` when booked. */
export const enquiryRuns: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context.skipRuns) return doc
  const vendor = relId(doc.vendor)
  if (!vendor) return doc
  const source = `enquiry:${doc.id}`
  const replied = (thread: unknown) => Array.isArray(thread) && thread.some((m) => m?.from === 'vendor')
  if (replied(doc.thread) && !replied(previousDoc?.thread)) {
    await awardQuietly(req.payload, { kind: 'v', id: vendor, reason: 'vendor_reply', source, req })
  }
  if (doc.status === 'booked' && previousDoc?.status !== 'booked') {
    await awardQuietly(req.payload, { kind: 'v', id: vendor, reason: 'vendor_booking', source, req })
  }
  return doc
}
