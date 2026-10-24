// GET /invite/<code> — a Runs club share link. A known code is kept in the httpOnly
// `zf_ref` cookie for 60 days; the next "Plan your event" enquiry from this browser
// is marked as referred (hooks/runsClub.ts → stampLeadAccounts), and the owner of
// the code earns runs if it books. An unknown code just goes on without a cookie.
import { NextResponse, type NextRequest } from 'next/server'

import { getPayloadClient } from '../../../../lib/payload'
import { REF_COOKIE, REF_COOKIE_MAX_AGE, findReferrer } from '../../../../lib/rewards'

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const code = String((await ctx.params).code || '').trim().toUpperCase()
  const event = req.nextUrl.searchParams.get('event')
  const target = new URL('/enquire', req.url)
  if (event && /^[a-z]{3,20}$/.test(event)) target.searchParams.set('event', event)

  const res = NextResponse.redirect(target, 307)
  res.headers.set('X-Robots-Tag', 'noindex')
  const referrer = await findReferrer(await getPayloadClient(), code).catch(() => null)
  if (referrer) {
    res.cookies.set(REF_COOKIE, code, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: REF_COOKIE_MAX_AGE,
    })
  }
  return res
}
