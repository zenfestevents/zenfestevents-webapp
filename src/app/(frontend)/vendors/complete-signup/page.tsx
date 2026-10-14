import type { Metadata } from 'next'

import { CompleteGoogleSignupPage } from '../../../../components/market/AccountPages'
import { FEATURES } from '../../../../lib/features'
import { ComingSoon } from '../../../../components/ComingSoon'

// Reads the Google sign-in cookie and the WhatsApp verification env at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Finish signing up', robots: { index: false } }

export default function VendorCompleteSignup() {
  if (!FEATURES.marketplace) return <ComingSoon feature="marketplace" title="Marketplace listings open soon" />
  return <CompleteGoogleSignupPage kind="vendor" />
}
