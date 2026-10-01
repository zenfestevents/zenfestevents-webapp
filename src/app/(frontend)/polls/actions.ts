'use server'

// Poll Server Actions. Public POST endpoints: each re-checks the poll is open and
// who is voting. Votes are inserted against the (poll, voterKey) unique index, so
// a double vote is rejected by the database (see collections/PollVotes.ts).
import { refresh } from 'next/cache'
import { cookies } from 'next/headers'

import { getPayloadClient } from '../../../lib/payload'
import { normalizePhone } from '../../../lib/phoneVerification'
import { canSeeResults, currentVoter, getPublicPoll, getResults, toPublicPoll, type PollResults } from '../../../lib/polls'
import { rateLimited } from '../../../lib/rateLimit'
import {
  VOTER_COOKIE,
  VOTER_COOKIE_MAX_AGE,
  checkVoterProof,
  pollVerifyMode,
  voterCookieValue,
} from '../../../lib/voterVerification'

type Fail = { ok: false; error: string }
type VoteResult =
  | { ok: true; myVote: string; results: PollResults | null; alreadyVoted?: boolean }
  | (Fail & { needVoter?: true; needVerified?: true })

const fail = (err: unknown): Fail => ({
  ok: false,
  error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
})

// ---------- voter identity ----------

export type IdentifyInput = {
  phone: string
  proof?: { id: string | number; token: string } | null
  consent?: boolean
  company?: string // honeypot
}

/**
 * Signs a visitor in as a poll voter by phone. With a valid proof (WhatsApp, or a
 * future OTP provider) the session is verified; in "off" mode it is phone-only.
 * Consent is only ever switched on here, never off.
 */
export async function identifyVoter(input: IdentifyInput): Promise<{ ok: true; verified: boolean } | Fail> {
  try {
    if (typeof input.company === 'string' && input.company.trim()) return { ok: false, error: 'Please try again.' }
    if (await rateLimited('voter', 10, 60 * 60 * 1000)) {
      return { ok: false, error: 'Too many attempts from this connection. Please try later.' }
    }
    const phone = normalizePhone(input.phone)
    if (!phone) return { ok: false, error: 'Enter a valid 10-digit mobile number.' }

    const payload = await getPayloadClient()
    const mode = pollVerifyMode()
    const verified = await checkVoterProof(payload, input.proof, phone)
    if (mode !== 'off' && !verified) {
      return { ok: false, error: 'Please verify your number on WhatsApp first.' }
    }

    const now = new Date().toISOString()
    const { docs } = await payload.find({
      collection: 'poll-voters',
      where: { phone: { equals: phone } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const consent = input.consent === true ? { marketingConsent: true, consentAt: now } : {}
    let voterId: number
    if (docs[0]) {
      voterId = docs[0].id
      await payload.update({
        collection: 'poll-voters',
        id: voterId,
        data: { ...(verified ? { phoneVerified: true } : {}), ...consent },
        overrideAccess: true,
      })
    } else {
      try {
        const created = await payload.create({
          collection: 'poll-voters',
          data: { phone, phoneVerified: verified, votes: 0, ...consent },
          overrideAccess: true,
        })
        voterId = created.id
      } catch {
        // Lost a race with another tab creating the same voter: use theirs.
        const again = await payload.find({
          collection: 'poll-voters',
          where: { phone: { equals: phone } },
          limit: 1,
          overrideAccess: true,
        })
        if (!again.docs[0]) throw new Error('Could not save your number. Please try again.')
        voterId = again.docs[0].id
      }
    }

    ;(await cookies()).set(VOTER_COOKIE, voterCookieValue(voterId, verified), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VOTER_COOKIE_MAX_AGE,
    })
    return { ok: true, verified }
  } catch (err) {
    return fail(err)
  }
}

/** "Not you?" — forget the voter on this browser. */
export async function signOutVoter(): Promise<{ ok: true }> {
  ;(await cookies()).delete(VOTER_COOKIE)
  refresh()
  return { ok: true }
}

// ---------- voting ----------

async function insertVote(
  pollId: number,
  optionId: string,
  voterKey: string,
  extra: { voter?: number; verified: boolean },
): Promise<'ok' | 'duplicate'> {
  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'poll-votes',
      data: { poll: pollId, optionId, voterKey, voter: extra.voter, verified: extra.verified },
      overrideAccess: true,
    })
    return 'ok'
  } catch (err) {
    // The (poll, voterKey) unique index rejected it: already voted.
    const { totalDocs } = await payload.count({
      collection: 'poll-votes',
      where: { and: [{ poll: { equals: pollId } }, { voterKey: { equals: voterKey } }] },
      overrideAccess: true,
    })
    if (totalDocs > 0) return 'duplicate'
    throw err
  }
}

/** Vote on a public poll as the signed-in voter. */
export async function castVote(slug: string, optionId: string): Promise<VoteResult> {
  try {
    if (await rateLimited('vote', 60, 10 * 60 * 1000)) {
      return { ok: false, error: 'Too many votes from this connection. Please wait a few minutes.' }
    }
    const poll = await getPublicPoll(slug)
    if (!poll) return { ok: false, error: 'Poll not found.' }
    if (poll.state !== 'open') return { ok: false, error: 'This poll has closed.' }
    if (!poll.options.some((o) => o.id === optionId)) return { ok: false, error: 'Pick one of the options.' }

    const voter = await currentVoter()
    if (!voter) return { ok: false, needVoter: true, error: 'Tell us your number to vote.' }
    if (pollVerifyMode() === 'live' && poll.requireVerified && !voter.verified) {
      return { ok: false, needVerified: true, error: 'This poll needs a verified number.' }
    }

    const voterKey = `p:${voter.voterId}`
    const outcome = await insertVote(poll.id, optionId, voterKey, { voter: voter.voterId, verified: voter.verified })
    const payload = await getPayloadClient()

    let myVote = optionId
    if (outcome === 'duplicate') {
      const { docs } = await payload.find({
        collection: 'poll-votes',
        where: { and: [{ poll: { equals: poll.id } }, { voterKey: { equals: voterKey } }] },
        limit: 1,
        overrideAccess: true,
      })
      myVote = docs[0]?.optionId ?? optionId
    } else {
      const v = await payload.findByID({ collection: 'poll-voters', id: voter.voterId, overrideAccess: true })
      await payload.update({
        collection: 'poll-voters',
        id: voter.voterId,
        data: { votes: (v.votes || 0) + 1, lastVotedAt: new Date().toISOString() },
        overrideAccess: true,
      })
    }

    refresh()
    return {
      ok: true,
      myVote,
      alreadyVoted: outcome === 'duplicate',
      results: canSeeResults(poll, true) ? await getResults(poll) : null,
    }
  } catch (err) {
    return fail(err)
  }
}

/**
 * Vote on a family's event poll (shown on their registry). No phone check —
 * one vote per device, keyed by a random id the browser keeps.
 */
export async function castEventVote(pollId: number, optionId: string, deviceId: string): Promise<VoteResult> {
  try {
    if (!/^[\w-]{16,64}$/.test(deviceId)) return { ok: false, error: 'Please reload the page and try again.' }
    if (await rateLimited('event-vote', 40, 10 * 60 * 1000)) {
      return { ok: false, error: 'Too many votes from this connection. Please wait a few minutes.' }
    }
    const payload = await getPayloadClient()
    const doc = await payload
      .findByID({ collection: 'polls', id: pollId, depth: 0, overrideAccess: true })
      .catch(() => null)
    const poll = doc?.registryEvent ? toPublicPoll(doc) : null
    if (!poll) return { ok: false, error: 'Poll not found.' }
    if (poll.state !== 'open') return { ok: false, error: 'This poll has closed.' }
    if (!poll.options.some((o) => o.id === optionId)) return { ok: false, error: 'Pick one of the options.' }

    const voterKey = `d:${deviceId}`
    const outcome = await insertVote(poll.id, optionId, voterKey, { verified: false })
    let myVote = optionId
    if (outcome === 'duplicate') {
      const { docs } = await payload.find({
        collection: 'poll-votes',
        where: { and: [{ poll: { equals: poll.id } }, { voterKey: { equals: voterKey } }] },
        limit: 1,
        overrideAccess: true,
      })
      myVote = docs[0]?.optionId ?? optionId
    }
    refresh()
    return {
      ok: true,
      myVote,
      alreadyVoted: outcome === 'duplicate',
      results: canSeeResults(poll, true) ? await getResults(poll) : null,
    }
  } catch (err) {
    return fail(err)
  }
}
