// GET /auth/google/callback — Google sends the visitor back here. Must match the
// "Authorised redirect URI" in Google Cloud Console (googleRedirectUri()).
//
// Known Google account or email → logged straight in (an email + password
// account gets linked, and counts as confirmed: Google proved the address).
// New → a signed "pending" cookie and the short finish-sign-up form.
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import {
  PENDING_COOKIE,
  PENDING_MAX_AGE,
  STATE_COOKIE,
  googleProfile,
  openCookie,
  sealCookie,
  type GoogleProfile,
  type GoogleState,
  type PendingGoogle,
} from '../../../../../lib/googleAuth'
import { getPayloadClient } from '../../../../../lib/payload'
import { ACCOUNT, safeNext, startSession } from '../../../../../lib/session'

const COMPLETE = { vendor: '/vendors/complete-signup', customer: '/account/complete-signup' } as const

export async function GET(request: NextRequest) {
  const jar = await cookies()
  const state = openCookie<GoogleState>(jar.get(STATE_COOKIE)?.value)
  jar.delete({ name: STATE_COOKIE, path: '/auth/google' })

  const params = request.nextUrl.searchParams
  const kind = state?.k === 'vendor' ? 'vendor' : 'customer'
  const failed = (reason: string) => `${ACCOUNT[kind].login}?google=${reason}`
  const code = params.get('code')

  // Cancelled on Google's screen, an old/forged state, or a missing code.
  if (!state || !code || params.get('state') !== state.s) redirect(failed(params.get('error') ? 'cancelled' : 'failed'))

  let profile: GoogleProfile
  try {
    profile = await googleProfile(code, state.v)
  } catch (err) {
    console.error('[google]', err instanceof Error ? err.message : err)
    redirect(failed('failed'))
  }
  if (!profile.emailVerified) redirect(failed('unverified'))

  const { collection, home } = ACCOUNT[kind]
  const payload = await getPayloadClient()
  const find = async (where: object) =>
    (await payload.find({ collection, where: where as never, limit: 1, overrideAccess: true, depth: 0 })).docs[0] as
      | { id: number | string; googleId?: string | null; _verified?: boolean | null }
      | undefined

  const account =
    (await find({ googleId: { equals: profile.sub } })) ?? (await find({ email: { equals: profile.email } }))

  if (account) {
    // The email's account is already linked to a different Google account.
    if (account.googleId && account.googleId !== profile.sub) redirect(failed('mismatch'))
    if (!account.googleId || !account._verified) {
      await payload.update({
        collection,
        id: account.id,
        data: { googleId: profile.sub, _verified: true } as never,
        overrideAccess: true,
      })
    }
    await startSession(collection, account.id)
    redirect(safeNext(state.n, home))
  }

  const pending: PendingGoogle = { sub: profile.sub, email: profile.email, name: profile.name, k: kind, n: state.n }
  jar.set(PENDING_COOKIE, sealCookie(pending, PENDING_MAX_AGE), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PENDING_MAX_AGE,
  })
  redirect(COMPLETE[kind])
}
