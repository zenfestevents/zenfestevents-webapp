// Server-only: who is logged in. Never import from a client component — it pulls
// in the Payload client (see CLAUDE.md).
//
// Admin (`users`), vendor and couple accounts all use Payload auth and share its
// `payload-token` cookie, so a browser holds one login at a time; always check
// `user.collection`, never just "is someone logged in".
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import type { Customer, Vendor } from '../payload-types'
import { getPayloadClient } from './payload'

export type AccountKind = 'vendor' | 'customer'

export const ACCOUNT = {
  vendor: { collection: 'vendors', home: '/vendors/dashboard', login: '/vendors/login' },
  customer: { collection: 'customers', home: '/account', login: '/account/login' },
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

export async function clearSessionCookie() {
  ;(await cookies()).delete(await cookieName())
}

/** Only same-site paths survive as a post-login destination (no open redirects). */
export function safeNext(next: unknown, fallback: string) {
  const s = typeof next === 'string' ? next : ''
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : fallback
}
