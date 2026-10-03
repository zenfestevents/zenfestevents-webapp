import type { IncomingAuthType } from 'payload'

const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Payload auth settings shared by the vendor and couple accounts: email +
 * password, 30-day sessions, a lock after 5 wrong passwords, and a reset email
 * that links to our own reset page (`resetPath`) instead of /admin.
 */
export function accountAuth(resetPath: string): IncomingAuthType {
  return {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      generateEmailSubject: () => 'Reset your Zenfest Events password',
      generateEmailHTML: (args) => {
        const link = `${siteUrl()}${resetPath}?token=${encodeURIComponent(args?.token ?? '')}`
        // Without SMTP Payload only logs the subject, so local dev could never reset.
        if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
          console.info(`[dev] password reset link: ${link}`)
        }
        const name = escape(String((args?.user as { name?: string } | undefined)?.name || 'there'))
        return `<p>Hi ${name},</p>
<p>Someone asked to reset the password for your Zenfest Events account. If it was you, set a new one here (the link works for one hour):</p>
<p><a href="${link}">${link}</a></p>
<p>If you didn't ask for this, ignore this email — your password stays the same.</p>
<p>— Zenfest Events</p>`
      },
    },
  }
}
