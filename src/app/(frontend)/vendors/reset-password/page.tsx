import React from 'react'
import type { Metadata } from 'next'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell, param, type SearchParams } from '../../../../components/market/AuthShell'

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false },
  // The reset token is in the URL.
  referrer: 'no-referrer',
}

export default async function VendorResetPage({ searchParams }: { searchParams: SearchParams }) {
  const token = param((await searchParams).token)
  return (
    <AuthShell
      eyebrow="For vendors"
      title={<>Set a new <span className="accent">password</span></>}
      lede="Choose a new password for your vendor account."
      formTitle="New password"
    >
      {token ? (
        <AuthForm kind="vendor" mode="reset" token={token} />
      ) : (
        <p className="muted">This link is missing its code. Open the link from the email again, or ask for a new one.</p>
      )}
    </AuthShell>
  )
}
