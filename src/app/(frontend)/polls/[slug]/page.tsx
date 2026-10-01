import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PollCard } from '../../../../components/polls/PollCard'
import { VoteCard } from '../../../../components/polls/VoteCard'
import { getPollView, getPublicPoll, listPublicPolls } from '../../../../lib/polls'
import { POLL_CATEGORIES } from '../../../../lib/pollOptions'
import { labelFor } from '../../../../lib/registryOptions'
import { pollVerifyMode } from '../../../../lib/voterVerification'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const poll = await getPublicPoll(slug)
  if (!poll) return { title: 'Poll not found' }
  const choices = poll.options.map((o) => o.label)
  const list = choices.length > 1 ? `${choices.slice(0, -1).join(', ')} or ${choices[choices.length - 1]}` : choices[0]
  const description =
    poll.state === 'open' ? `${list}? Cast your vote and see what everyone thinks.` : `${list} — see how people voted.`
  // A static image, not a generated opengraph-image: Next's ImageResponse loads its own
  // sharp build, which clashes with Payload's on Windows and crashed the dev server.
  const image = poll.imageUrl || '/brand/logo-full.png'
  return {
    title: `${poll.question} — Zenfest Polls`,
    description,
    openGraph: { title: poll.question, description, type: 'website', images: [image] },
  }
}

export default async function PollPage({ params }: Props) {
  const { slug } = await params
  const poll = await getPublicPoll(slug)
  if (!poll) notFound()
  const [view, more] = await Promise.all([getPollView(poll), listPublicPolls('open')])
  const others = more.filter((p) => p.id !== poll.id).slice(0, 3)

  return (
    <section className="section--tight">
      <div className="container polls-single">
        <Link href={poll.state === 'open' ? '/polls' : '/polls/closed'} className="reg-link">
          ← {poll.state === 'open' ? 'All live polls' : 'All results'}
        </Link>
        <article className="poll-feature card">
          <p className="eyebrow">
            {labelFor(POLL_CATEGORIES, poll.category)} · {poll.state === 'open' ? 'Live poll' : 'Closed'}
          </p>
          <h1 className="poll-feature__q">{poll.question}</h1>
          {poll.description && <p className="muted poll-feature__desc">{poll.description}</p>}
          {poll.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="poll-feature__img" src={poll.imageUrl} alt="" />
          )}
          <VoteCard
            poll={poll}
            results={view.results}
            myVote={view.myVote}
            voter={view.voter}
            verifyMode={pollVerifyMode()}
          />
          {poll.sponsor && (
            <p className="poll-sponsor">
              Poll partner:{' '}
              {poll.sponsor.url ? (
                <a href={poll.sponsor.url} target="_blank" rel="noopener sponsored">
                  {poll.sponsor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poll.sponsor.logoUrl} alt={poll.sponsor.name} />
                  ) : (
                    poll.sponsor.name
                  )}
                </a>
              ) : (
                poll.sponsor.name
              )}
            </p>
          )}
        </article>

        {others.length > 0 && (
          <>
            <h2 className="reg-section-title polls-more-title">More live polls</h2>
            <ul className="poll-grid">
              {others.map((p) => (
                <PollCard key={p.id} poll={p} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
