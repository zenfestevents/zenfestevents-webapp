import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell } from '../../../../components/market/AuthShell'
import { EMAIL_LOGIN } from '../../../../lib/accountOptions'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

export default function VendorForgotPage() {
  if (!EMAIL_LOGIN) redirect('/vendors/login')
  return (
    <AuthShell
      eyebrow="For vendors"
      title={<>Forgot your <span className="accent">password?</span></>}
      lede="Enter the email you signed up with and we'll send you a link to set a new one."
      formTitle="Reset password"
    >
      <AuthForm kind="vendor" mode="forgot" />
    </AuthShell>
  )
}
