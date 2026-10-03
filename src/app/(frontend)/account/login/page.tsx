import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell, param, type SearchParams } from '../../../../components/market/AuthShell'
import { getCustomer, safeNext } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Log in', robots: { index: false } }

export default async function CustomerLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const next = param((await searchParams).next)
  if (await getCustomer()) redirect(safeNext(next, '/account'))
  return (
    <AuthShell
      eyebrow="Your account"
      title={<>Welcome <span className="accent">back</span></>}
      lede="Log in to see your shortlist, quotes and messages from vendors."
      formTitle="Log in"
    >
      <AuthForm kind="customer" mode="login" next={next || undefined} />
      <p className="auth__switch muted">
        Are you a vendor? <Link href="/vendors/login">Vendor log in</Link>
      </p>
    </AuthShell>
  )
}
