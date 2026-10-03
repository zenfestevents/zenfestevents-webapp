import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell, param, type SearchParams } from '../../../../components/market/AuthShell'
import { verifyMode } from '../../../../lib/phoneVerification'
import { getCustomer, safeNext } from '../../../../lib/session'

// Reads the session and the WhatsApp verification env at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Shortlist vendors, get quotes and plan your event with Zenfest Events.',
}

const POINTS = [
  ['Prices upfront', 'Every vendor shows an all-in price card — no "price on request".'],
  ['Checked by our team', 'Listings go live only after Zenfest reviews them.'],
  ['DIY or done-for-you', 'Book vendors yourself, or hand your shortlist to our planners any time.'],
] as const

export default async function CustomerSignupPage({ searchParams }: { searchParams: SearchParams }) {
  const next = param((await searchParams).next)
  if (await getCustomer()) redirect(safeNext(next, '/account'))
  return (
    <AuthShell
      eyebrow="Your account"
      title={<>Plan smart with <span className="accent">Zenfest</span></>}
      lede="One free account to shortlist vendors, ask for quotes and keep every conversation in one place."
      points={POINTS}
      formTitle="Create your account"
    >
      <AuthForm kind="customer" mode="signup" verifyMode={verifyMode()} next={next || undefined} />
    </AuthShell>
  )
}
