import { NextResponse } from 'next/server'

import { getSessionUser } from '../../../../lib/session'

/**
 * GET /account/session → who is logged in, for the header's account button
 * (fetched from the client so the layout never waits on auth). Never cached.
 */
export async function GET() {
  const user = await getSessionUser().catch(() => null)
  const kind = user?.collection === 'vendors' ? 'vendor' : user?.collection === 'customers' ? 'customer' : null
  const name = kind ? String((user as { name?: string }).name ?? '').split(' ')[0] : ''
  return NextResponse.json({ kind, name }, { headers: { 'Cache-Control': 'private, no-store' } })
}
