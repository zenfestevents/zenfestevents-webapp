'use client'

import Link from 'next/link'
import React, { useState } from 'react'

/**
 * Stage decoration pages ask "Does your venue already have a stage?". A mandapam usually does,
 * an open ground or resort doesn't, and then the stage is extra. The cost text is built on the
 * server and only handed over for a logged-in client (lib/decorations.ts → stagePriceFor).
 */
export function StageQuestion({ stage, next }: { stage: { state: 'shown'; text: string } | { state: 'login' }; next: string }) {
  const [answer, setAnswer] = useState<'yes' | 'no' | ''>('')
  const q = encodeURIComponent(next)
  return (
    <div className="dc-stage card">
      <p className="dc-stage__q" id="dc-stage-q">
        Does your venue already have a stage?
      </p>
      <div className="dc-stage__choices" role="group" aria-labelledby="dc-stage-q">
        <button
          type="button"
          className={`sp-chip ${answer === 'yes' ? 'is-active' : ''}`}
          aria-pressed={answer === 'yes'}
          onClick={() => setAnswer('yes')}
        >
          Yes, it has one
        </button>
        <button
          type="button"
          className={`sp-chip ${answer === 'no' ? 'is-active' : ''}`}
          aria-pressed={answer === 'no'}
          onClick={() => setAnswer('no')}
        >
          No, we need a stage
        </button>
      </div>
      {answer === 'yes' ? (
        <p className="dc-stage__answer muted">Great: no stage needed. This decoration goes on the stage you already have.</p>
      ) : null}
      {answer === 'no' ? (
        stage.state === 'shown' ? (
          <p className="dc-stage__answer">{stage.text}</p>
        ) : (
          <>
            <p className="dc-stage__answer muted">Log in to see the stage cost. It takes a minute with your WhatsApp number.</p>
            <div className="btn-row">
              <Link className="btn btn--primary" href={`/account/login?next=${q}`}>
                Log in
              </Link>
              <Link className="btn btn--ghost" href={`/account/signup?next=${q}`}>
                Create free account
              </Link>
            </div>
          </>
        )
      ) : null}
    </div>
  )
}

/** Short heads-up shown on the decoration pages (about a quarter of mandapams allow only their own decorators). */
export function VenueNotice() {
  return (
    <div className="dc-notice" role="note">
      <strong>Check with your venue first</strong>
      <p>
        Some mandapams and halls allow only their own decorators. Ask yours before you book, and tell us on the{' '}
        <Link href="/enquire">Plan your event</Link> form. We will help you check.
      </p>
    </div>
  )
}
