// GET /invite/<code> — a Runs club share link, for a client (default) or a vendor
// (`?for=vendor`). A known code is kept in the httpOnly `zf_ref` cookie for 60 days:
// the next sign-up, "Plan your event" enquiry or partner application from this
// browser is credited to its owner (hooks/runsClub.ts, lib/rewards.ts). The visit is
// counted once per browser (anonymous `zf_vis` id) as "opened your link", then the
// visitor lands on /welcome. `?event=` still goes straight to the enquiry form.
import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { getPayloadClient } from '../../../../lib/payload'
import { REF_COOKIE, REF_COOKIE_MAX_AGE, findReferrer, recordReferralVisit } from '../../../../lib/rewards'

const VISITOR_COOKIE = 'zf_vis'

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const code = String((await ctx.params).code || '').trim().toUpperCase()
  const event = req.nextUrl.searchParams.get('event')
  const audience = req.nextUrl.searchParams.get('for') === 'vendor' ? 'vendor' : 'client'

  let target: URL
  if (event && /^[a-z]{3,20}$/.test(event)) {
    target = new URL('/enquire', req.url)
    target.searchParams.set('event', event)
  } else {
    target = new URL('/welcome', req.url)
    if (audience === 'vendor') target.searchParams.set('for', 'vendor')
  }

  const res = NextResponse.redirect(target, 307)
  res.headers.set('X-Robots-Tag', 'noindex')
  const payload = await getPayloadClient()
  const referrer = await findReferrer(payload, code).catch(() => null)
  if (referrer) {
    const cookie = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' }
    res.cookies.set(REF_COOKIE, code, { ...cookie, maxAge: REF_COOKIE_MAX_AGE })
    const visitor = req.cookies.get(VISITOR_COOKIE)?.value || randomBytes(12).toString('hex')
    res.cookies.set(VISITOR_COOKIE, visitor, { ...cookie, maxAge: 60 * 60 * 24 * 365 })
    await recordReferralVisit(payload, referrer.key, visitor, audience)
  }
  return res
}
