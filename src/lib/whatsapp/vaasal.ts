// Server-only: Vaasal, now 64 Sqft (Zenfest's property app), borrows our WhatsApp number
// for its login until it has its own. Meta allows one webhook per app, so ours hands Vaasal's
// login messages on to Vaasal, byte for byte with Meta's signature (both apps check it
// with the same App secret), and keeps them out of our inbox. Off unless
// VAASAL_WEBHOOK_URL is set.
import type { WebhookBody } from './events'

/**
 * The patterns the property app itself reads: "64 Sqft login code: 123456" (or the Tamil
 * wording), and the old "Vaasal login code: 123456" / "வாசல் …" while old links are about.
 * "64 sq ft" alone is an ordinary phrase, so the new form needs the login wording too.
 */
const VAASAL_LOGIN =
  /(?:vaasal|வாசல்)\D{0,60}?\d{6}(?!\d)|64\s*sq\.?\s*ft\s*(?:login code|உள்நுழைவுக் குறியீடு)\s*:?\s*\d{6}(?!\d)/i

export function isVaasalLogin(text: string | undefined): boolean {
  return !!text && VAASAL_LOGIN.test(text)
}

export function vaasalForwardingOn(): boolean {
  return Boolean(process.env.VAASAL_WEBHOOK_URL)
}

/** Whether the webhook carries a Vaasal login, and the body without those messages. */
export function splitVaasal(body: WebhookBody): { found: boolean; rest: WebhookBody } {
  let found = false
  const entry = body.entry?.map((e) => ({
    ...e,
    changes: e.changes?.map((change) => {
      const messages = change.value?.messages
      if (!messages) return change
      const kept = messages.filter((m) => !(m.type === 'text' && isVaasalLogin(m.text?.body)))
      if (kept.length === messages.length) return change
      found = true
      return { ...change, value: { ...change.value, messages: kept } }
    }),
  }))
  return { found, rest: found ? { ...body, entry } : body }
}

/** Posts Meta's raw body and signature to Vaasal. Returns an error message, or null when it went through. */
export async function forwardToVaasal(raw: string, signature: string | null): Promise<string | null> {
  const url = process.env.VAASAL_WEBHOOK_URL
  if (!url) return 'VAASAL_WEBHOOK_URL is not set'
  if (!signature) return 'no signature to pass on'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
      body: raw,
      signal: AbortSignal.timeout(8000),
    })
    return res.ok ? null : `Vaasal answered HTTP ${res.status}`
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}
