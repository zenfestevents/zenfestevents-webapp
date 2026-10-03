import React from 'react'
import type { Metadata } from 'next'

import { AuthForm } from '../../../../components/market/AuthForm'
import { AuthShell } from '../../../../components/market/AuthShell'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

export default function CustomerForgotPage() {
  return (
    <AuthShell
      eyebrow="Your account"
      title={<>Forgot your <span className="accent">password?</span></>}
      lede="Enter the email you signed up with and we'll send you a link to set a new one."
      formTitle="Reset password"
    >
      <AuthForm kind="customer" mode="forgot" />
    </AuthShell>
  )
}
