// Server-only helpers for WhatsApp "reverse" phone verification: the visitor
// sends a prefilled code to our WhatsApp number and Meta's webhook tells us
// which number it came from. Don't import this from client components.
import { randomBytes, randomInt } from 'crypto'

/**
 * - `live`: WhatsApp Cloud API is configured, the webhook verifies numbers.
 * - `test`: local dev without WhatsApp; the form offers a "simulate" button.
 * - `off`:  production before WhatsApp is set up; forms skip verification.
 */
export type VerifyMode = 'live' | 'test' | 'off'

export function verifyMode(): VerifyMode {
  if (process.env.WHATSAPP_BUSINESS_NUMBER && process.env.WHATSAPP_APP_SECRET) return 'live'
  return process.env.NODE_ENV === 'production' ? 'off' : 'test'
}

/** How long a code stays valid. */
export const VERIFY_TTL_MS = 10 * 60 * 1000

/** The text visitors send; the webhook looks for this. */
export const VERIFY_PREFIX = 'ZENFEST VERIFY'

/** Indian mobile as its last 10 digits ("+91 98400-12345" → "9840012345"), or null. */
export function normalizePhone(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '')
  const last10 = digits.slice(-10)
  return /^[6-9]\d{9}$/.test(last10) ? last10 : null
}

export function newCode() {
  return String(randomInt(100000, 1000000))
}

export function newToken() {
  return randomBytes(24).toString('hex')
}

/** wa.me link that opens WhatsApp with the code typed in, addressed to us. */
export function waLink(code: string) {
  const to = (process.env.WHATSAPP_BUSINESS_NUMBER || '').replace(/\D/g, '')
  return `https://wa.me/${to}?text=${encodeURIComponent(`${VERIFY_PREFIX} ${code}`)}`
}
