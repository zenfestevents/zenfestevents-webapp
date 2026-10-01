// Server-only poll data access (Local API). Never import from a client component.
// Like lib/registry.ts, this is the boundary: client components get `PublicPoll`
// and `PollResults`, never raw docs, and results are withheld when a poll's
// settings say so.
import { cookies } from 'next/headers'

import type { Poll } from '../payload-types'
import { mediaUrl, type MediaDoc } from './media'
import { getPayloadClient } from './payload'
import { CATEGORY_CTA, type PollCategory } from './pollOptions'
import { VOTER_COOKIE, readVoterCookie, type VoterSession } from './voterVerification'

export type PublicPoll = {
  id: number
  slug: string
  question: string
  category: PollCategory
  description: string
  imageUrl: string
  options: { id: string; label: string }[]
  state: 'open' | 'closed'
  closesAt: string | null
  featured: boolean
  resultsVisibility: NonNullable<Poll['resultsVisibility']>
  electionSensitive: boolean
  requireVerified: boolean
  sponsor: { name: string; logoUrl: string; url: string } | null
  cta: { text: string; label: string; href: string }
  createdAt: string
}

export type PollResults = {
  total: number
  verified: number
  counts: Record<string, number>
}

/** Draft polls have no state (hidden); a passed `closesAt` closes a poll without a cron. */
export function pollState(p: Pick<Poll, 'status' | 'closesAt'>, now = Date.now()): 'open' | 'closed' | null {
  if (p.status === 'draft') return null
  if (p.status === 'closed') return 'closed'
  if (p.closesAt && new Date(p.closesAt).getTime() <= now) return 'closed'
  return 'open'
}

export function toPublicPoll(p: Poll): PublicPoll | null {
  const state = pollState(p)
  if (!state) return null
  const fallback = CATEGORY_CTA[p.category]
  return {
    id: p.id,
    slug: p.slug || String(p.id),
    question: p.question,
    category: p.category,
    description: p.description || '',
    imageUrl: mediaUrl(p.image as MediaDoc, 'card'),
    options: (p.options || []).map((o, i) => ({ id: o.id || String(i), label: o.label })),
    state,
    closesAt: p.closesAt || null,
    featured: Boolean(p.featured),
    resultsVisibility: p.resultsVisibility || 'after-vote',
    electionSensitive: Boolean(p.electionSensitive),
    requireVerified: p.requireVerified !== false,
    sponsor: p.sponsor?.name
      ? { name: p.sponsor.name, logoUrl: mediaUrl(p.sponsor.logo as MediaDoc), url: p.sponsor.url || '' }
      : null,
    cta: {
      text: p.cta?.text || fallback.text,
      label: p.cta?.label || fallback.label,
      href: p.cta?.href || fallback.href,
    },
    createdAt: p.createdAt,
  }
}

/** Whether results may be shown to this viewer. */
export function canSeeResults(poll: PublicPoll, hasVoted: boolean): boolean {
  if (poll.electionSensitive && poll.state === 'open') return false
  if (poll.state === 'closed') return true
  if (poll.resultsVisibility === 'always') return true
  if (poll.resultsVisibility === 'after-vote') return hasVoted
  return false
}

export async function getResults(poll: Pick<PublicPoll, 'id' | 'options'>): Promise<PollResults> {
  const payload = await getPayloadClient()
  const [perOption, verified] = await Promise.all([
    Promise.all(
      poll.options.map((o) =>
        payload
          .count({
            collection: 'poll-votes',
            where: { and: [{ poll: { equals: poll.id } }, { optionId: { equals: o.id } }] },
            overrideAccess: true,
          })
          .then((r) => [o.id, r.totalDocs] as const),
      ),
    ),
    payload.count({
      collection: 'poll-votes',
      where: { and: [{ poll: { equals: poll.id } }, { verified: { equals: true } }] },
      overrideAccess: true,
    }),
  ])
  const counts = Object.fromEntries(perOption)
  return { total: perOption.reduce((n, [, c]) => n + c, 0), verified: verified.totalDocs, counts }
}

/** The option this voter key picked, or null. */
export async function getVoteFor(pollId: number, voterKey: string): Promise<string | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'poll-votes',
    where: { and: [{ poll: { equals: pollId } }, { voterKey: { equals: voterKey } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]?.optionId ?? null
}

/** The signed-in public-poll voter (from the `zf_voter` cookie), if any. */
export async function currentVoter(): Promise<(VoterSession & { phoneTail: string }) | null> {
  const session = readVoterCookie((await cookies()).get(VOTER_COOKIE)?.value)
  if (!session) return null
  const payload = await getPayloadClient()
  const voter = await payload
    .findByID({ collection: 'poll-voters', id: session.voterId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!voter) return null
  return { ...session, phoneTail: voter.phone.slice(-4) }
}

// ---------- public polls ----------

async function findPublicPolls() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'polls',
    where: { and: [{ registryEvent: { exists: false } }, { status: { not_equals: 'draft' } }] },
    sort: '-createdAt',
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })
  return docs.map(toPublicPoll).filter((p): p is PublicPoll => Boolean(p))
}

export type PollListItem = PublicPoll & { total: number; leading: { label: string; pct: number } | null }

/** Open or closed public polls, with vote totals (and the leader, where results may show). */
export async function listPublicPolls(state: 'open' | 'closed'): Promise<PollListItem[]> {
  const polls = (await findPublicPolls()).filter((p) => p.state === state)
  return Promise.all(
    polls.map(async (p) => {
      const r = await getResults(p)
      const top = p.options.reduce<{ label: string; n: number } | null>(
        (best, o) => ((r.counts[o.id] || 0) > (best?.n ?? 0) ? { label: o.label, n: r.counts[o.id] } : best),
        null,
      )
      const leading =
        top && r.total && canSeeResults(p, false) ? { label: top.label, pct: Math.round((top.n / r.total) * 100) } : null
      return { ...p, total: r.total, leading }
    }),
  )
}

export async function getPublicPoll(slug: string): Promise<PublicPoll | null> {
  if (!slug || slug.length > 100) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'polls',
    where: { and: [{ slug: { equals: slug } }, { registryEvent: { exists: false } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return docs[0] ? toPublicPoll(docs[0]) : null
}

/** The featured open poll (newest), else the newest open poll. */
export async function getFeaturedPoll(): Promise<PublicPoll | null> {
  const open = (await findPublicPolls()).filter((p) => p.state === 'open')
  return open.find((p) => p.featured) ?? open[0] ?? null
}

// ---------- event polls (inside a registry) ----------

export async function listEventPolls(eventId: number): Promise<PublicPoll[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'polls',
    where: { and: [{ registryEvent: { equals: eventId } }, { status: { not_equals: 'draft' } }] },
    sort: 'createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  return docs.map(toPublicPoll).filter((p): p is PublicPoll => Boolean(p))
}

/** What the signed-in voter (if any) sees for a public poll: their vote and the results. */
export async function getPollView(poll: PublicPoll) {
  const voter = await currentVoter()
  const myVote = voter ? await getVoteFor(poll.id, `p:${voter.voterId}`) : null
  const results = canSeeResults(poll, Boolean(myVote)) ? await getResults(poll) : null
  return {
    myVote,
    results,
    voter: voter ? { verified: voter.verified, phoneTail: voter.phoneTail } : null,
  }
}
