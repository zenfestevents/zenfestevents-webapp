// Server-only: the fields of a new vendor / couple account, shared by every way of
// signing up (email form, Google, WhatsApp). Never import from a client component.
import type { Payload } from 'payload'

import { UserError, dayToDate, slugify, text } from './formCheck'
import { isCategory } from './marketplaceOptions'
import { getPayloadClient } from './payload'
import { normalizePhone } from './phoneVerification'
import { ACCOUNT, type AccountKind } from './session'

export type SignUpDetails = {
  name: string
  phone: string
  phoneProof?: { id: string | number; token: string } | null
  // vendor
  businessName?: string
  category?: string
  otherService?: string
  // couple
  city?: string
  eventDate?: string
  consent?: boolean
  next?: string
  company?: string // honeypot
}

export async function uniqueSlug(base: string) {
  const payload = await getPayloadClient()
  const root = slugify(base) || 'vendor'
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? root : `${root}-${i}`
    const { totalDocs } = await payload.count({
      collection: 'vendors',
      where: { slug: { equals: slug } },
      overrideAccess: true,
    })
    if (!totalDocs) return slug
  }
  return `${root}-${Date.now().toString(36)}`
}

/** Validates name, phone and the vendor / couple extras; returns the account data (no proof checked yet). */
export async function signUpData(kind: AccountKind, input: Omit<SignUpDetails, 'phoneProof' | 'next' | 'company'>) {
  const name = text(input.name, 120)
  const phone = normalizePhone(input.phone)
  if (name.length < 2) throw new UserError('Enter your name.')
  if (!phone) throw new UserError('Enter a valid 10-digit mobile number.')

  const data: Record<string, unknown> = { name, phone }
  if (kind === 'vendor') {
    const businessName = text(input.businessName, 120)
    if (businessName.length < 2) throw new UserError('Enter your business name.')
    if (!isCategory(input.category)) throw new UserError('Choose what you offer.')
    const otherService = input.category === 'other' ? text(input.otherService, 80) : ''
    if (input.category === 'other' && !otherService) throw new UserError('Tell us which service you offer.')
    Object.assign(data, {
      businessName,
      category: input.category,
      otherService: otherService || undefined,
      slug: await uniqueSlug(businessName),
      listingStatus: 'draft',
    })
  } else {
    const eventDate = input.eventDate ? dayToDate(input.eventDate) : null
    Object.assign(data, {
      city: text(input.city, 80) || undefined,
      eventDate: eventDate?.toISOString(),
      marketingConsent: input.consent === true,
    })
  }
  return { data, phone }
}

/**
 * Accounts of this kind whose number was verified on WhatsApp, newest first —
 * the only ones a WhatsApp login may open. An unverified number proves nothing,
 * so typing someone else's number into a profile can't capture their login.
 */
export async function verifiedAccountsWithPhone(payload: Payload, kind: AccountKind, phone: string) {
  const { docs } = await payload.find({
    collection: ACCOUNT[kind].collection,
    where: { and: [{ phone: { equals: phone } }, { phoneVerified: { equals: true } }] },
    sort: '-updatedAt',
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  return docs
}
