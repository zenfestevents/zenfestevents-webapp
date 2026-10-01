import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { KolamRosette } from '../../../components/Kolam'
import { PollCard } from '../../../components/polls/PollCard'
import { VoteCard } from '../../../components/polls/VoteCard'
import { getPollView, listPublicPolls, type PollListItem } from '../../../lib/polls'
import { POLL_CATEGORIES, type PollCategory } from '../../../lib/pollOptions'
import { labelFor } from '../../../lib/registryOptions'
import { pollVerifyMode } from '../../../lib/voterVerification'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Zenfest Polls — Verified Votes, Real Opinions',
  description:
    'Vote on cricket, cinema, food, lifestyle and the questions everyone in Tamil Nadu is talking about. One person, one vote.',
}

const SORTS = [
  ['latest', 'Latest'],
  ['votes', 'Most voted'],
  ['closing', 'Closing soon'],
] as const

type Props = { searchParams: Promise<{ cat?: string; sort?: string }> }

function sortPolls(list: PollListItem[], sort: string) {
  if (sort === 'votes') return [...list].sort((a, b) => b.total - a.total)
  if (sort === 'closing') {
    const t = (p: PollListItem) => (p.closesAt ? new Date(p.closesAt).getTime() : Infinity)
    return [...list].sort((a, b) => t(a) - t(b))
  }
  return list
}

export default async function PollsPage({ searchParams }: Props) {
  const { cat, sort = 'latest' } = await searchParams
  const all = await listPublicPolls('open')
  const featured = all.find((p) => p.featured) ?? all[0] ?? null
  const featuredView = featured ? await getPollView(featured) : null
  const category = POLL_CATEGORIES.some(([v]) => v === cat) ? (cat as PollCategory) : null
  const shown = sortPolls(
    all.filter((p) => p !== featured && (!category || p.category === category)),
    sort,
  )
  const totalVotes = all.reduce((n, p) => n + p.total, 0)
  const qs = (next: { cat?: string | null; sort?: string }) => {
    const p = new URLSearchParams()
    const c = next.cat === undefined ? category : next.cat
    const s = next.sort ?? sort
    if (c) p.set('cat', c)
    if (s !== 'latest') p.set('sort', s)
    const str = p.toString()
    return str ? `/polls?${str}` : '/polls'
  }

  return (
    <>
      <section className="section band-ink polls-hero">
        <KolamRosette size={360} className="reg-landing__kolam" />
        <div className="container polls-hero__inner">
          <p className="eyebrow">Zenfest Polls</p>
          <h1 className="display-l">
            Verified votes. <span className="italic accent">Real opinions.</span>
          </h1>
          <p className="lede">
            Cricket, cinema, food and the questions everyone’s arguing about. One person, one vote — then share
            the result on WhatsApp.
          </p>
          <p className="polls-hero__stats">
            <strong>{all.length}</strong> live poll{all.length === 1 ? '' : 's'} ·{' '}
            <strong>{totalVotes.toLocaleString('en-IN')}</strong> votes cast
          </p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container polls-layout">
          {featured && featuredView && (
            <article className="poll-feature card">
              <p className="eyebrow">Featured poll · {labelFor(POLL_CATEGORIES, featured.category)}</p>
              <h2 className="poll-feature__q">
                <Link href={`/polls/${featured.slug}`}>{featured.question}</Link>
              </h2>
              <VoteCard
                poll={featured}
                results={featuredView.results}
                myVote={featuredView.myVote}
                voter={featuredView.voter}
                verifyMode={pollVerifyMode()}
              />
            </article>
          )}

          <nav className="polls-filters" aria-label="Filter polls">
            <div className="polls-chips">
              <Link className={`chip ${!category ? 'is-active' : ''}`} href={qs({ cat: null })}>
                All
              </Link>
              {POLL_CATEGORIES.filter(([v]) => v !== 'event').map(([v, l]) => (
                <Link key={v} className={`chip ${category === v ? 'is-active' : ''}`} href={qs({ cat: v })}>
                  {l}
                </Link>
              ))}
            </div>
            <div className="polls-sort">
              {SORTS.map(([v, l]) => (
                <Link key={v} className={`reg-link ${sort === v ? 'is-active' : ''}`} href={qs({ sort: v })}>
                  {l}
                </Link>
              ))}
            </div>
          </nav>

          {shown.length ? (
            <ul className="poll-grid">
              {shown.map((p) => (
                <PollCard key={p.id} poll={p} />
              ))}
            </ul>
          ) : (
            <p className="reg-empty muted">
              {all.length ? 'No other open polls here right now.' : 'New polls are coming soon.'}{' '}
              <Link className="accent" href="/polls/closed">
                See past results →
              </Link>
            </p>
          )}

          <p className="polls-more">
            <Link className="btn btn--ghost" href="/polls/closed">
              Closed polls & results
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
