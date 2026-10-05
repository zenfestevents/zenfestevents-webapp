// GET /auth/google?kind=vendor|customer&next=/path — starts "Continue with Google".
// Lives under /auth, not /api, to stay clear of Payload's catch-all.
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { STATE_COOKIE, STATE_MAX_AGE, googleEnabled, startGoogleLogin } from '../../../../lib/googleAuth'
import { ACCOUNT, safeNext } from '../../../../lib/session'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const kind = params.get('kind') === 'vendor' ? 'vendor' : 'customer'
  if (!googleEnabled()) redirect(ACCOUNT[kind].login)

  const next = safeNext(params.get('next'), '')
  const { url, cookie } = startGoogleLogin(kind, next)
  ;(await cookies()).set(STATE_COOKIE, cookie, {
    httpOnly: true,
    // Lax so the cookie comes back on Google's top-level redirect to the callback.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth/google',
    maxAge: STATE_MAX_AGE,
  })
  redirect(url)
}
