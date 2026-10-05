// Server-only: "Continue with Google" for vendor and couple accounts.
//
// A plain OAuth 2.0 code flow with PKCE (no extra packages): /auth/google sends
// the visitor to Google, /auth/google/callback swaps the code for their profile
// over a server-to-server call. Google has already confirmed the email, so these
// accounts skip the confirm-your-email step. On by itself once GOOGLE_CLIENT_ID
// and GOOGLE_CLIENT_SECRET are set; the buttons are hidden otherwise.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { siteUrl } from './marketplaceMail'
import type { AccountKind } from './session'

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

/** Must be listed under "Authorised redirect URIs" in Google Cloud Console. */
export const googleRedirectUri = () => `${siteUrl()}/auth/google/callback`

export const STATE_COOKIE = 'zf_google_state'
export const PENDING_COOKIE = 'zf_google_pending'
export const STATE_MAX_AGE = 10 * 60
export const PENDING_MAX_AGE = 30 * 60

// ---------- signed cookie values ----------

const sign = (value: string) =>
  createHmac('sha256', `${process.env.PAYLOAD_SECRET || 'dev-secret'}:google`).update(value).digest('base64url')

/** `<base64url json>.<signature>`, with an expiry inside so an old value can't be replayed. */
export function sealCookie(data: Record<string, unknown>, maxAgeSeconds: number) {
  const body = Buffer.from(JSON.stringify({ ...data, x: Date.now() + maxAgeSeconds * 1000 })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function openCookie<T>(value: string | undefined): T | null {
  const m = value?.match(/^([\w-]+)\.([\w-]+)$/)
  if (!m) return null
  const expected = Buffer.from(sign(m[1]))
  const given = Buffer.from(m[2])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'))
    return typeof data?.x === 'number' && data.x > Date.now() ? (data as T) : null
  } catch {
    return null
  }
}

// ---------- the OAuth round trip ----------

export type GoogleState = { s: string; v: string; k: AccountKind; n?: string }

/** A new state + PKCE verifier and the Google URL to send the visitor to. */
export function startGoogleLogin(kind: AccountKind, next?: string) {
  const state: GoogleState = {
    s: randomBytes(16).toString('base64url'),
    v: randomBytes(32).toString('base64url'),
    k: kind,
    n: next || undefined,
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: state.s,
    code_challenge: createHash('sha256').update(state.v).digest('base64url'),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return { url: url.toString(), cookie: sealCookie(state, STATE_MAX_AGE) }
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string }

/** Swaps the callback's code for the visitor's Google profile. Throws on any failure. */
export async function googleProfile(code: string, verifier: string): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    cache: 'no-store',
  })
  const tokens = await tokenRes.json().catch(() => null)
  if (!tokenRes.ok || !tokens?.access_token) {
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${tokens?.error || 'no token'}`)
  }
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  })
  const info = await infoRes.json().catch(() => null)
  if (!infoRes.ok || !info?.sub || !info?.email) throw new Error(`Google userinfo failed (${infoRes.status})`)
  return {
    sub: String(info.sub),
    email: String(info.email).toLowerCase(),
    emailVerified: info.email_verified === true || info.email_verified === 'true',
    name: String(info.name || info.given_name || '').slice(0, 120),
  }
}

const NOTICES: Record<string, string> = {
  cancelled: 'Google sign-in was cancelled. Try again, or use your email below.',
  failed: 'We couldn’t sign you in with Google. Please try again, or use your email below.',
  unverified: 'Google hasn’t confirmed that account’s email. Please sign up with your email below.',
  mismatch: 'This email is already linked to a different Google account. Log in with your password instead.',
  expired: 'Your Google sign-in timed out. Please choose “Continue with Google” again.',
}

/** The message for a `?google=<reason>` the callback redirected with. */
export const googleNotice = (reason: string) => NOTICES[reason] || undefined

/** A Google sign-in that still needs the sign-up form (phone, business…) to become an account. */
export type PendingGoogle = { sub: string; email: string; name: string; k: AccountKind; n?: string }
