import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell, param, type SearchParams } from '../../../../components/market/AuthShell'
import { getVendor, safeNext } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Vendor log in', robots: { index: false } }

export default async function VendorLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const next = param((await searchParams).next)
  if (await getVendor()) redirect(safeNext(next, '/vendors/dashboard'))
  return (
    <AuthShell
      eyebrow="For vendors"
      title={<>Welcome <span className="accent">back</span></>}
      lede="Log in to update your listing, prices and dates, and reply to couples."
      formTitle="Vendor log in"
    >
      <AuthForm kind="vendor" mode="login" next={next || undefined} />
    </AuthShell>
  )
}
