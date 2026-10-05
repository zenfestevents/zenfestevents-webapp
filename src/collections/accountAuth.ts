import type { IncomingAuthType } from 'payload'

const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const firstName = (user: unknown) => escape(String((user as { name?: string } | undefined)?.name || 'there'))

// Without SMTP Payload only logs an email's subject, so local dev could never
// reset a password or confirm an email. Print the link instead.
const devLog = (what: string, link: string) => {
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    console.info(`[dev] ${what} link: ${link}`)
  }
}

/** The link in a confirm-your-email message (also used by `resendVerification`). */
export const verifyLink = (verifyPath: string, token: string) =>
  `${siteUrl()}${verifyPath}?token=${encodeURIComponent(token)}`

export function verifyEmailHTML(verifyPath: string, token: string, user: unknown) {
  const link = verifyLink(verifyPath, token)
  devLog('email confirmation', link)
  return `<p>Hi ${firstName(user)},</p>
<p>Thanks for creating a Zenfest Events account. Please confirm this is your email address:</p>
<p><a href="${link}">${link}</a></p>
<p>If you didn't sign up, ignore this email — no account will be activated.</p>
<p>— Zenfest Events</p>`
}

export const VERIFY_SUBJECT = 'Confirm your email for Zenfest Events'

/**
 * Payload auth settings shared by the vendor and couple accounts: email +
 * password, 30-day sessions, a lock after 5 wrong passwords, and reset /
 * confirm-your-email messages that link to our own pages instead of /admin.
 *
 * `verify` means a new account can't log in until its email is confirmed.
 * Sign-up creates accounts already confirmed when emails can't be sent
 * (`emailChecksOn()` in lib/authActions.ts), and Google sign-ins are confirmed
 * by Google.
 */
export function accountAuth(paths: { reset: string; verify: string }): IncomingAuthType {
  return {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    verify: {
      generateEmailSubject: () => VERIFY_SUBJECT,
      generateEmailHTML: (args) => verifyEmailHTML(paths.verify, args?.token ?? '', args?.user),
    },
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      generateEmailSubject: () => 'Reset your Zenfest Events password',
      generateEmailHTML: (args) => {
        const link = `${siteUrl()}${paths.reset}?token=${encodeURIComponent(args?.token ?? '')}`
        devLog('password reset', link)
        return `<p>Hi ${firstName(args?.user)},</p>
<p>Someone asked to reset the password for your Zenfest Events account. If it was you, set a new one here (the link works for one hour):</p>
<p><a href="${link}">${link}</a></p>
<p>If you didn't ask for this, ignore this email — your password stays the same.</p>
<p>— Zenfest Events</p>`
      },
    },
  }
}
