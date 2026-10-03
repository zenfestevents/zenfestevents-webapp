// Server-only. Marketplace notification emails. Like notifySubmission they fail
// softly: without SMTP (local dev) Payload logs the email to the console, and an
// error never undoes the enquiry that was already saved.
import { getPayloadClient } from './payload'

export const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function sendMail(to: string | undefined | null, subject: string, lines: string[]) {
  if (!to) return
  const payload = await getPayloadClient()
  try {
    await payload.sendEmail({ to, subject, text: [...lines, '', '— Zenfest Events'].join('\n') })
  } catch (err) {
    payload.logger.warn(
      `[marketplaceMail] Could not send "${subject}" to ${to}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/** Copy to the team inbox, so they can see marketplace activity without logging in. */
export function teamInbox() {
  return process.env.LEAD_NOTIFICATION_EMAIL || 'zenfestevents@gmail.com'
}
