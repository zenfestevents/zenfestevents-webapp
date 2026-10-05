// Server-only: who is logged in. Never import from a client component — it pulls
// in the Payload client (see CLAUDE.md).
//
// Admin (`users`), vendor and couple accounts all use Payload auth and share its
// `payload-token` cookie, so a browser holds one login at a time; always check
// `user.collection`, never just "is someone logged in".
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createLocalReq, getFieldsToSign, jwtSign } from 'payload'
import { addSessionToUser } from 'payload/shared'

import type { Customer, Vendor } from '../payload-types'
import { getPayloadClient } from './payload'

export type AccountKind = 'vendor' | 'customer'

export const ACCOUNT = {
  vendor: { collection: 'vendors', home: '/vendors/dashboard', login: '/vendors/login', verify: '/vendors/verify-email' },
  customer: { collection: 'customers', home: '/account', login: '/account/login', verify: '/account/verify-email' },
} as const

/** The logged-in account of any kind, or null. */
export async function getSessionUser() {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user ?? null
}

export async function getVendor(): Promise<Vendor | null> {
  const user = await getSessionUser()
  return user?.collection === 'vendors' ? (user as Vendor) : null
}

export async function getCustomer(): Promise<Customer | null> {
  const user = await getSessionUser()
  return user?.collection === 'customers' ? (user as Customer) : null
}

/** For pages: the vendor, or a redirect to the vendor login that comes back to `next`. */
export async function requireVendor(next: string = ACCOUNT.vendor.home): Promise<Vendor> {
  const vendor = await getVendor()
  if (!vendor) redirect(`${ACCOUNT.vendor.login}?next=${encodeURIComponent(next)}`)
  return vendor
}

export async function requireCustomer(next: string = ACCOUNT.customer.home): Promise<Customer> {
  const customer = await getCustomer()
  if (!customer) redirect(`${ACCOUNT.customer.login}?next=${encodeURIComponent(next)}`)
  return customer
}

async function cookieName() {
  const payload = await getPayloadClient()
  return `${payload.config.cookiePrefix || 'payload'}-token`
}

/** Stores the token from `payload.login()` the way Payload's own REST login does. */
export async function setSessionCookie(token: string, exp?: number) {
  ;(await cookies()).set(await cookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(exp ? { expires: new Date(exp * 1000) } : {}),
  })
}

/**
 * Logs an account in without a password (Google sign-in) — the same steps as
 * Payload's own login: add a session to the account, sign a JWT, set the cookie.
 */
export async function startSession(collection: (typeof ACCOUNT)[AccountKind]['collection'], id: number | string) {
  const payload = await getPayloadClient()
  const collectionConfig = payload.collections[collection].config
  // The raw row (with `sessions`), as Payload's login reads it.
  const user = await payload.db.findOne<{ id: number | string; email?: string }>({ collection, where: { id: { equals: id } } })
  if (!user) throw new Error('Account not found')
  const req = await createLocalReq({}, payload)
  const { sid } = await addSessionToUser({ collectionConfig, payload, req, user: user as never })
  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: String(user.email ?? ''),
    sid,
    user: { ...user, collection } as never,
  })
  const { token, exp } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })
  await setSessionCookie(token, exp)
}

export async function clearSessionCookie() {
  ;(await cookies()).delete(await cookieName())
}

/** Only same-site paths survive as a post-login destination (no open redirects). */
export function safeNext(next: unknown, fallback: string) {
  const s = typeof next === 'string' ? next : ''
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : fallback
}
