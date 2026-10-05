import type { Metadata } from 'next'

import { VerifyEmailPage } from '../../../../components/market/AccountPages'
import { param, type SearchParams } from '../../../../components/market/AuthShell'

// Confirms the token on every visit.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false },
  // The confirmation token is in the URL.
  referrer: 'no-referrer',
}

export default async function CustomerVerifyEmail({ searchParams }: { searchParams: SearchParams }) {
  return <VerifyEmailPage kind="customer" token={param((await searchParams).token)} />
}
