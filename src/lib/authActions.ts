'use server'

// Sign-up, log-in, log-out and password reset for vendor and couple accounts.
// These are public POST endpoints: everything is validated here, accounts are
// created with whitelisted fields only, and the session is Payload's own JWT in
// the `payload-token` cookie (see lib/session.ts).
import { redirect } from 'next/navigation'

import { UserError, dayToDate, fail, isEmail, slugify, text } from './formCheck'
import { sendMail, siteUrl, teamInbox } from './marketplaceMail'
import { PASSWORD_MIN, categoryLabel, isCategory } from './marketplaceOptions'
import { getPayloadClient } from './payload'
import { consumePhoneProof, normalizePhone, verifyMode } from './phoneVerification'
import { rateLimited } from './rateLimit'
import { ACCOUNT, clearSessionCookie, safeNext, setSessionCookie, type AccountKind } from './session'

type AuthResult = { ok: true; redirect: string } | { ok: false; error: string }

const kindOf = (v: unknown): AccountKind => (v === 'vendor' ? 'vendor' : 'customer')

export type SignUpInput = {
  kind: AccountKind
  name: string
  email: string
  password: string
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

async function uniqueSlug(base: string) {
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

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  try {
    const kind = kindOf(input?.kind)
    const { collection } = ACCOUNT[kind]
    if (text(input.company, 100)) return { ok: false, error: 'Please try again.' }
    if (await rateLimited(`signup-${kind}`, 10, 60 * 60 * 1000)) {
      throw new UserError('Too many sign-ups from this connection. Please try again later.')
    }

    const name = text(input.name, 120)
    const email = text(input.email, 200).toLowerCase()
    const password = typeof input.password === 'string' ? input.password : ''
    const phone = normalizePhone(input.phone)
    if (name.length < 2) throw new UserError('Enter your name.')
    if (!isEmail(email)) throw new UserError('Enter a valid email address.')
    if (password.length < PASSWORD_MIN || password.length > 128) {
      throw new UserError(`Choose a password of at least ${PASSWORD_MIN} characters.`)
    }
    if (!phone) throw new UserError('Enter a valid 10-digit mobile number.')

    const vendorData: Record<string, unknown> = {}
    const customerData: Record<string, unknown> = {}
    if (kind === 'vendor') {
      const businessName = text(input.businessName, 120)
      if (businessName.length < 2) throw new UserError('Enter your business name.')
      if (!isCategory(input.category)) throw new UserError('Choose what you offer.')
      const otherService = input.category === 'other' ? text(input.otherService, 80) : ''
      if (input.category === 'other' && !otherService) throw new UserError('Tell us which service you offer.')
      Object.assign(vendorData, {
        businessName,
        category: input.category,
        otherService: otherService || undefined,
        slug: await uniqueSlug(businessName),
        listingStatus: 'draft',
      })
    } else {
      const eventDate = input.eventDate ? dayToDate(input.eventDate) : null
      Object.assign(customerData, {
        city: text(input.city, 80) || undefined,
        eventDate: eventDate?.toISOString(),
        marketingConsent: input.consent === true,
      })
    }

    const payload = await getPayloadClient()
    const existing = await payload.count({
      collection,
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    if (existing.totalDocs) {
      throw new UserError('An account with this email already exists. Log in instead.')
    }

    // Checked last: consuming the WhatsApp proof is one-time.
    let phoneVerified = false
    if (verifyMode() !== 'off') {
      if (!(await consumePhoneProof(payload, input.phoneProof, phone))) {
        throw new UserError('Verify your phone number on WhatsApp first.')
      }
      phoneVerified = true
    }

    const account = await payload.create({
      collection,
      data: { email, password, name, phone, phoneVerified, ...vendorData, ...customerData } as never,
      overrideAccess: true,
    })

    const { token, exp } = await payload.login({ collection, data: { email, password } })
    if (token) await setSessionCookie(token, exp)

    if (kind === 'vendor') {
      await sendMail(teamInbox(), `New vendor sign-up: ${vendorData.businessName}`, [
        `${name} signed up as a ${categoryLabel(vendorData.category)} vendor.`,
        `Business: ${vendorData.businessName}`,
        `Phone: ${phone}${phoneVerified ? ' (verified on WhatsApp)' : ''}`,
        `Email: ${email}`,
        '',
        `They'll build their listing and send it for review. Admin: ${siteUrl()}/admin/collections/vendors/${account.id}`,
      ])
    }
    return {
      ok: true,
      redirect: kind === 'vendor' ? '/vendors/dashboard?welcome=1' : safeNext(input.next, ACCOUNT.customer.home),
    }
  } catch (err) {
    return fail(err)
  }
}

export async function logIn(input: {
  kind: AccountKind
  email: string
  password: string
  next?: string
}): Promise<AuthResult> {
  const kind = kindOf(input?.kind)
  const { collection, home } = ACCOUNT[kind]
  try {
    if (await rateLimited('login', 20, 15 * 60 * 1000)) {
      throw new UserError('Too many attempts from this connection. Please wait a few minutes.')
    }
    const email = text(input.email, 200).toLowerCase()
    const password = typeof input.password === 'string' ? input.password : ''
    if (!isEmail(email) || !password) throw new UserError('Enter your email and password.')
    const payload = await getPayloadClient()
    let result
    try {
      result = await payload.login({ collection, data: { email, password } })
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'LockedAuth') {
        throw new UserError('Too many wrong passwords. Try again in 10 minutes, or reset your password.')
      }
      throw new UserError(
        kind === 'vendor'
          ? 'That email and password don’t match a vendor account.'
          : 'That email and password don’t match an account.',
      )
    }
    if (!result.token) throw new UserError('Could not log you in. Please try again.')
    await setSessionCookie(result.token, result.exp)
    return { ok: true, redirect: safeNext(input.next, home) }
  } catch (err) {
    return fail(err)
  }
}

export async function logOut(formData?: FormData) {
  await clearSessionCookie()
  redirect(safeNext(formData?.get('next'), '/'))
}

/** Always answers the same, so the form can't be used to find out who has an account. */
export async function forgotPassword(input: { kind: AccountKind; email: string }) {
  const kind = kindOf(input?.kind)
  const email = text(input?.email, 200).toLowerCase()
  if (!isEmail(email)) return { ok: false as const, error: 'Enter a valid email address.' }
  if (await rateLimited('forgot', 6, 60 * 60 * 1000)) {
    return { ok: false as const, error: 'Too many requests. Please try again later.' }
  }
  try {
    const payload = await getPayloadClient()
    await payload.forgotPassword({ collection: ACCOUNT[kind].collection, data: { email } })
  } catch (err) {
    console.warn('[forgotPassword]', err instanceof Error ? err.message : err)
  }
  return { ok: true as const }
}

export async function resetPassword(input: {
  kind: AccountKind
  token: string
  password: string
}): Promise<AuthResult> {
  const kind = kindOf(input?.kind)
  const { collection, home } = ACCOUNT[kind]
  try {
    const password = typeof input.password === 'string' ? input.password : ''
    if (password.length < PASSWORD_MIN || password.length > 128) {
      throw new UserError(`Choose a password of at least ${PASSWORD_MIN} characters.`)
    }
    const payload = await getPayloadClient()
    let result
    try {
      result = await payload.resetPassword({
        collection,
        data: { token: text(input.token, 200), password },
        overrideAccess: true,
      })
    } catch {
      throw new UserError('This reset link has expired or was already used. Ask for a new one.')
    }
    if (result.token) await setSessionCookie(result.token, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30)
    return { ok: true, redirect: home }
  } catch (err) {
    return fail(err)
  }
}
