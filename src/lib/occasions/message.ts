// Client-safe: phone format and the WhatsApp message for an occasion reminder.
import { whatsappLink } from '../site'

/**
 * A phone as WhatsApp wants it: country code + number, digits only. Indian
 * numbers typed any way ("98400 12345", "+91-98400-12345", "098400 12345")
 * become "919840012345"; other countries must be typed with their code.
 * Returns null when it can't be a phone number.
 */
export function toWaNumber(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '')
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`
  if (/^91[6-9]\d{9}$/.test(digits)) return digits
  if (/^00\d{10,13}$/.test(digits)) return digits.slice(2)
  if (/^[1-9]\d{10,14}$/.test(digits) && !digits.startsWith('91')) return digits
  return null
}

/**
 * "919840012345" → "+91 98400 12345"; US/Canada "12125550101" → "+1 212 555 0101";
 * other countries just get a "+" (their code length varies).
 */
export function formatPhone(waNumber: string | null | undefined): string {
  const d = String(waNumber ?? '').replace(/\D/g, '')
  if (/^91\d{10}$/.test(d)) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`
  if (/^1\d{10}$/.test(d)) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return d ? `+${d}` : ''
}

export function reminderWaLink(phone: string | null | undefined, message?: string | null): string {
  return whatsappLink(toWaNumber(phone) ?? '', message || undefined)
}

/** Placeholders staff can use in Reminder Settings templates. */
export const MESSAGE_PLACEHOLDERS = '{name} {whose} {milestone} {date} {days}'

export const DEFAULT_CLIENT_MESSAGE = `Hi {name}! Greetings from Zenfest Events 🎉

Just a reminder: {whose} {milestone} is on {date}. We loved being part of your celebration, so shall we make this one special too? A surprise décor setup, a cake, a small party or a full event — tell us what you have in mind and we'll plan it for you.

Reply here for ideas and a quote.`

export const DEFAULT_LEAD_MESSAGE = `Hi {name}! This is Zenfest Events 🎉

{whose_cap} {milestone} is coming up on {date}. Planning something to celebrate? We do surprise décor, cakes, small parties and full events at a budget that suits you.

Reply here and we'll send you a few ideas.`

export type MessageVars = {
  name: string
  personName?: string | null
  milestone: string
  date: string
  days: string
}

/** Fills `{name}`, `{whose}` ("your" / "Aarav's"), `{whose_cap}`, `{milestone}`, `{date}`, `{days}`. */
export function fillMessage(template: string, vars: MessageVars): string {
  const person = vars.personName?.trim()
  const whose = person ? `${person}'s` : 'your'
  const values: Record<string, string> = {
    name: vars.name.trim().split(/\s+/)[0] || vars.name,
    whose,
    whose_cap: whose.charAt(0).toUpperCase() + whose.slice(1),
    milestone: vars.milestone,
    date: vars.date,
    days: vars.days,
  }
  return template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all)
}
