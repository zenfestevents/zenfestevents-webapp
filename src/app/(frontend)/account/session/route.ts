import { NextResponse } from 'next/server'

import { getRewardSettings } from '../../../../lib/rewards'
import { tierFor, tiersFor } from '../../../../lib/rewardTiers'
import { getSessionUser } from '../../../../lib/session'

/**
 * GET /account/session → who is logged in, for the header's account button and the
 * phone bar's runs line (fetched from the client so the layout never waits on auth).
 * Logged in, it also carries the Runs club standing; logged out, the runs a couple gets
 * for joining and for a first enquiry (the sign-up popup, JoinPrompt). Never cached.
 */
export async function GET() {
  const user = await getSessionUser().catch(() => null)
  const kind = user?.collection === 'vendors' ? 'vendor' : user?.collection === 'customers' ? 'customer' : null
  const name = kind ? String((user as { name?: string }).name ?? '').split(' ')[0] : ''
  const settings = await getRewardSettings().catch(() => null)
  let standing: { runs: number; tier: string; next: string | null; toNext: number; progress: number } | null = null
  if (kind && settings) {
    const runs = Number((user as { runs?: number | null }).runs) || 0
    const s = tierFor(runs, tiersFor(settings, kind === 'vendor' ? 'v' : 'c'))
    standing = { runs, tier: s.tier.name, next: s.next?.name ?? null, toNext: s.toNext, progress: s.progress }
  }
  const join = !kind && settings ? { joined: settings.runsPer.joined, enquiry: settings.runsPer.enquiry } : null
  // A couple's saved vendors (ids), for hearts on cached pages such as the homepage.
  const shortlist =
    kind === 'customer'
      ? ((user as { shortlist?: (number | { id: number })[] | null }).shortlist ?? []).map((s) =>
          typeof s === 'object' ? s.id : s,
        )
      : []
  return NextResponse.json({ kind, name, standing, shortlist, join }, { headers: { 'Cache-Control': 'private, no-store' } })
}
