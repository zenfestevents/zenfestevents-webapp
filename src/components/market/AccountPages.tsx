// Server components shared by the vendor and couple account pages (they read the
// database / cookies, so never import this from a client component).
import React from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { PENDING_COOKIE, openCookie, type PendingGoogle } from '../../lib/googleAuth'
import { getPayloadClient } from '../../lib/payload'
import { verifyMode } from '../../lib/phoneVerification'
import { ACCOUNT, type AccountKind } from '../../lib/session'
import { AuthForm } from './AuthForm'
import { AuthShell } from './AuthShell'

/** /account/verify-email and /vendors/verify-email — the link in the confirm-your-email message. */
export async function VerifyEmailPage({ kind, token }: { kind: AccountKind; token: string }) {
  const { collection, login } = ACCOUNT[kind]
  let ok = false
  if (token) {
    try {
      const payload = await getPayloadClient()
      ok = await payload.verifyEmail({ collection, token })
    } catch {
      ok = false // unknown or already-used token
    }
  }
  return (
    <AuthShell
      eyebrow={kind === 'vendor' ? 'For vendors' : 'Your account'}
      title={ok ? <>Email <span className="accent">confirmed</span></> : <>Link <span className="accent">expired</span></>}
      lede={
        ok
          ? 'Thanks — your account is switched on.'
          : 'This confirmation link has already been used or isn’t valid.'
      }
      formTitle={ok ? 'You’re all set' : 'What now?'}
    >
      <div className="form-success" role="status">
        <p className="muted">
          {ok
            ? 'Log in with the email and password you chose when you signed up.'
            : 'If you already confirmed your email, just log in. If not, try logging in — you’ll get a button to send a fresh link.'}
        </p>
        <Link className="btn btn--primary" href={login}>
          Log in
        </Link>
      </div>
    </AuthShell>
  )
}

/** /account/complete-signup and /vendors/complete-signup — after a new "Continue with Google". */
export async function CompleteGoogleSignupPage({ kind }: { kind: AccountKind }) {
  const pending = openCookie<PendingGoogle>((await cookies()).get(PENDING_COOKIE)?.value)
  const signup = kind === 'vendor' ? '/vendors/signup' : '/account/signup'
  if (!pending) redirect(`${signup}?google=expired`)
  if (pending.k !== kind) redirect(pending.k === 'vendor' ? '/vendors/complete-signup' : '/account/complete-signup')
  return (
    <AuthShell
      eyebrow={kind === 'vendor' ? 'For vendors' : 'Your account'}
      title={<>Almost <span className="accent">there</span></>}
      lede={
        kind === 'vendor'
          ? 'Google confirmed your email. Tell us about your business to finish your vendor account.'
          : 'Google confirmed your email. A few details and your account is ready.'
      }
      formTitle="Finish signing up"
    >
      <AuthForm
        kind={kind}
        mode="google"
        verifyMode={verifyMode()}
        prefill={{ name: pending.name, email: pending.email }}
      />
    </AuthShell>
  )
}
