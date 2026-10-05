import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell, param, type SearchParams } from '../../../../components/market/AuthShell'
import { googleEnabled, googleNotice } from '../../../../lib/googleAuth'
import { verifyMode } from '../../../../lib/phoneVerification'
import { getVendor } from '../../../../lib/session'

// Reads the session and the WhatsApp verification env at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'List your business — vendor sign-up',
  description: 'Create a free Zenfest vendor account and get enquiries from couples across Chennai.',
}

const POINTS = [
  ['Free to list', 'No package fees, no lock-in. You only hear from couples who are planning a real event.'],
  ['Real, verified enquiries', 'Couples log in and tell you their date, guests, area and budget up front.'],
  ['Your prices, upfront', 'Show an all-in price card so the people who call can afford you.'],
] as const

export default async function VendorSignupPage({ searchParams }: { searchParams: SearchParams }) {
  if (await getVendor()) redirect('/vendors/dashboard')
  const sp = await searchParams
  return (
    <AuthShell
      eyebrow="For vendors"
      title={<>List your business on <span className="accent">Zenfest</span></>}
      lede="Photographers, makeup artists, decorators, caterers, bakers and halls — create your account, build your listing, and our team will put it live."
      points={POINTS}
      formTitle="Create your vendor account"
    >
      <AuthForm
        kind="vendor"
        mode="signup"
        verifyMode={verifyMode()}
        google={googleEnabled()}
        notice={googleNotice(param(sp.google))}
      />
    </AuthShell>
  )
}
