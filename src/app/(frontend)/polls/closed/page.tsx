import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { PollCard } from '../../../../components/polls/PollCard'
import { listPublicPolls } from '../../../../lib/polls'
import { POLL_CATEGORIES, type PollCategory } from '../../../../lib/pollOptions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Closed Polls & Results — Zenfest Polls',
  description: 'How people voted on past Zenfest polls.',
}

type Props = { searchParams: Promise<{ cat?: string }> }

export default async function ClosedPollsPage({ searchParams }: Props) {
  const { cat } = await searchParams
  const category = POLL_CATEGORIES.some(([v]) => v === cat) ? (cat as PollCategory) : null
  const polls = (await listPublicPolls('closed')).filter((p) => !category || p.category === category)

  return (
    <section className="section">
      <div className="container polls-layout">
        <div className="section-head">
          <div>
            <p className="eyebrow">Zenfest Polls</p>
            <h1 className="display-l">
              How people <span className="italic accent">voted</span>
            </h1>
          </div>
          <Link href="/polls" className="section-head__link">
            Live polls →
          </Link>
        </div>
        <div className="polls-chips">
          <Link className={`chip ${!category ? 'is-active' : ''}`} href="/polls/closed">
            All
          </Link>
          {POLL_CATEGORIES.filter(([v]) => v !== 'event').map(([v, l]) => (
            <Link key={v} className={`chip ${category === v ? 'is-active' : ''}`} href={`/polls/closed?cat=${v}`}>
              {l}
            </Link>
          ))}
        </div>
        {polls.length ? (
          <ul className="poll-grid">
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} />
            ))}
          </ul>
        ) : (
          <p className="reg-empty muted">No closed polls here yet.</p>
        )}
      </div>
    </section>
  )
}
