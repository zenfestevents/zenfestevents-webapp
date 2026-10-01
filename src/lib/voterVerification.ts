// Server-only: who is voting on public polls, and how they proved it.
//
// This is the swappable step. Today a voter proves their number with the
// WhatsApp reverse check (lib/phoneVerification.ts); to add an SMS/OTP provider
// (Firebase, MSG91, 2Factor…), add a branch to `pollVerifyMode()` and
// `checkVoterProof()` — nothing else in the poll code needs to change.
import { createHmac, timingSafeEqual } from 'node:crypto'

import type { Payload } from 'payload'

import { consumePhoneProof, verifyMode, type VerifyMode } from './phoneVerification'

/** `live`: proof required · `test`: dev "Simulate" button · `off`: phone only, unverified. */
export function pollVerifyMode(): VerifyMode {
  return verifyMode()
}

/** Is `proof` a valid, unused verification for `phone`? Consumes it if so. */
export async function checkVoterProof(
  payload: Payload,
  proof: { id?: unknown; token?: unknown } | null | undefined,
  phone: string,
): Promise<boolean> {
  if (pollVerifyMode() === 'off') return false
  return consumePhoneProof(payload, proof, phone)
}

// ---------- signed voter cookie ----------

export const VOTER_COOKIE = 'zf_voter'
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const sign = (value: string) =>
  createHmac('sha256', `${process.env.PAYLOAD_SECRET || 'dev-secret'}:voter`).update(value).digest('base64url')

/**
 * `<voterId>.<v|u>.<signature>`. The v/u flag records whether *this browser*
 * proved the number — someone who merely types a verified voter's phone gets an
 * unverified session, so their votes are never counted as verified.
 */
export const voterCookieValue = (voterId: number, verified: boolean) => {
  const body = `${voterId}.${verified ? 'v' : 'u'}`
  return `${body}.${sign(body)}`
}

export type VoterSession = { voterId: number; verified: boolean }

/** The session inside a cookie value, if its signature is ours. */
export function readVoterCookie(value: string | undefined): VoterSession | null {
  const m = value?.match(/^(\d+)\.([vu])\.([\w-]+)$/)
  if (!m) return null
  const expected = Buffer.from(sign(`${m[1]}.${m[2]}`))
  const given = Buffer.from(m[3])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return { voterId: Number(m[1]), verified: m[2] === 'v' }
}
