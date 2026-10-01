import Link from 'next/link'
import React from 'react'

import type { PollListItem } from '../../lib/polls'
import { POLL_CATEGORIES } from '../../lib/pollOptions'
import { labelFor } from '../../lib/registryOptions'

/** A poll in the /polls grid. */
export function PollCard({ poll }: { poll: PollListItem }) {
  return (
    <li className="poll-card">
      <Link href={`/polls/${poll.slug}`} className="poll-card__link">
        <span className="poll-card__meta">
          <span className="poll-chip">{labelFor(POLL_CATEGORIES, poll.category)}</span>
          {poll.state === 'closed' && <span className="poll-chip poll-chip--closed">Closed</span>}
          {poll.sponsor && <span className="poll-card__sponsor">with {poll.sponsor.name}</span>}
        </span>
        <h3 className="poll-card__q">{poll.question}</h3>
        {poll.leading && (
          <span className="poll-card__lead">
            <span className="poll-card__bar" aria-hidden="true">
              <span style={{ width: `${poll.leading.pct}%` }} />
            </span>
            {poll.state === 'closed' ? 'Winner' : 'Leading'}: <strong>{poll.leading.label}</strong> · {poll.leading.pct}%
          </span>
        )}
        <span className="poll-card__foot">
          <span>
            {poll.total.toLocaleString('en-IN')} vote{poll.total === 1 ? '' : 's'}
          </span>
          <span className="poll-card__cta">{poll.state === 'open' ? 'Vote now →' : 'See results →'}</span>
        </span>
      </Link>
    </li>
  )
}
