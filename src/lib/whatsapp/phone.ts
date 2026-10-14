// WhatsApp numbers are stored the way the Cloud API wants them: country code +
// number, digits only ("919840012345"). Client-safe (no server imports).

/**
 * "+91 98400-12345", "098400 12345" or "9840012345" → "919840012345".
 * Numbers that already carry another country code (NRI contacts) are kept as
 * digits. Returns null when it can't be a WhatsApp number.
 */
export function toWaNumber(input: unknown): string | null {
  let digits = String(input ?? '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) return /^[6-9]/.test(digits) ? `91${digits}` : null
  if (digits.length === 12 && digits.startsWith('91')) return /^91[6-9]/.test(digits) ? digits : null
  return digits.length >= 11 && digits.length <= 15 ? digits : null
}

/** The forms a phone might have been typed in elsewhere on the site (Leads keep what people typed). */
export function phoneVariants(wa: string): string[] {
  if (!wa.startsWith('91') || wa.length !== 12) return [wa, `+${wa}`]
  const local = wa.slice(2)
  return [wa, `+${wa}`, local, `0${local}`, `+91 ${local}`, `${local.slice(0, 5)} ${local.slice(5)}`]
}

/** "919840012345" → "+91 98400 12345" for display. */
export function formatWaNumber(wa: string): string {
  if (wa.length === 12 && wa.startsWith('91')) return `+91 ${wa.slice(2, 7)} ${wa.slice(7)}`
  return `+${wa}`
}
