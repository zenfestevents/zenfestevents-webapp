import type { Metadata } from 'next'

import { CompleteGoogleSignupPage } from '../../../../components/market/AccountPages'

// Reads the Google sign-in cookie and the WhatsApp verification env at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Finish signing up', robots: { index: false } }

export default function VendorCompleteSignup() {
  return <CompleteGoogleSignupPage kind="vendor" />
}
