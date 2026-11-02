'use client'

import Link from 'next/link'
import React, { useState } from 'react'

import { VENUE_DECORATORS } from '../../lib/decorOptions'
import { whatsappLink } from '../../lib/site'

/** Add-ons are asked about here and priced by the team on WhatsApp (owner, 2026-11-02): nothing is priced on the site. */
const ADD_ONS = [
  ['name_board', 'Name / welcome board'],
  ['entrance', 'Entrance decoration'],
  ['other', 'Carpet / sofa / other'],
] as const

/**
 * "Plan this setup" on a backdrop's page. Every decoration is a backdrop; the rest (stage, name
 * board, entrance, carpet…) are add-ons. A login is compulsory (owner, 2026-11-02), so the
 * client knows Zenfest and can see prices; logged out, the box is just the log-in prompt. Logged
 * in, the client answers the two venue questions, ticks add-ons and sends everything to the team
 * on WhatsApp, who quote the add-ons. The stage cost text is built on the server and only
 * handed over for a logged-in client (lib/decorations.ts → stagePriceFor).
 */
export function PlanSetup({
  loggedIn,
  name,
  code,
  title,
  stageText,
  whatsapp,
  next,
}: {
  loggedIn: boolean
  name: string
  code: string
  title: string
  stageText: string
  whatsapp?: string
  next: string
}) {
  const [stage, setStage] = useState<'yes' | 'no' | ''>('')
  const [outside, setOutside] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [more, setMore] = useState('')
  const q = encodeURIComponent(next)

  if (!loggedIn) {
    return (
      <div className="dc-stage card">
        <p className="dc-stage__q">Plan this setup</p>
        <p className="dc-stage__answer muted">
          Log in to plan this setup, see prices and send your details to our team. It takes a minute with your WhatsApp number.
        </p>
        <div className="btn-row">
          <Link className="btn btn--primary" href={`/account/login?next=${q}`}>
            Log in
          </Link>
          <Link className="btn btn--ghost" href={`/account/signup?next=${q}`}>
            Create free account
          </Link>
        </div>
      </div>
    )
  }

  const toggle = (v: string) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
  const ready = stage !== '' && outside !== ''
  const outsideLabel = VENUE_DECORATORS.find(([v]) => v === outside)?.[1] ?? ''
  const addOnLines = ADD_ONS.filter(([v]) => picked.includes(v)).map(([v, label]) =>
    v === 'other' && more.trim() ? `${label}: ${more.trim()}` : label,
  )
  const message = [
    `Hi Zenfest, I'm ${name || 'a client'}. I'd like to plan this setup: ${title} (${code}).`,
    `Venue has a stage: ${stage === 'yes' ? 'Yes' : stage === 'no' ? 'No, we need a stage' : ''}`,
    `Venue allows outside decorators: ${outsideLabel}`,
    `Add-ons: ${addOnLines.length ? addOnLines.join(', ') : 'none for now'}`,
    'Please share the price for the add-ons.',
  ].join('\n')

  return (
    <div className="dc-stage card">
      <p className="dc-stage__q">Plan this setup</p>
      <p className="muted dc-price__note">
        Answer these and send them to our team on WhatsApp. We will confirm the price of the add-ons for you.
      </p>

      <fieldset className="dc-plan__group">
        <legend className="dc-plan__legend">Does your venue already have a stage?</legend>
        <div className="dc-stage__choices">
          <button type="button" className={`sp-chip ${stage === 'yes' ? 'is-active' : ''}`} aria-pressed={stage === 'yes'} onClick={() => setStage('yes')}>
            Yes, it has one
          </button>
          <button type="button" className={`sp-chip ${stage === 'no' ? 'is-active' : ''}`} aria-pressed={stage === 'no'} onClick={() => setStage('no')}>
            No, we need a stage
          </button>
        </div>
        {stage === 'no' ? <p className="dc-stage__answer">{stageText}</p> : null}
      </fieldset>

      <fieldset className="dc-plan__group">
        <legend className="dc-plan__legend">Does your venue allow outside decorators?</legend>
        <div className="dc-stage__choices">
          {VENUE_DECORATORS.map(([v, label]) => (
            <button key={v} type="button" className={`sp-chip ${outside === v ? 'is-active' : ''}`} aria-pressed={outside === v} onClick={() => setOutside(v)}>
              {label}
            </button>
          ))}
        </div>
        {outside === 'no' ? (
          <p className="dc-stage__answer muted">Some venues allow only their own decorators. Tell us the venue and we will help you check.</p>
        ) : null}
      </fieldset>

      <fieldset className="dc-plan__group">
        <legend className="dc-plan__legend">Add-ons you would like (optional)</legend>
        <div className="dc-addons">
          {ADD_ONS.map(([v, label]) => (
            <label key={v} className="dc-addons__item">
              <input type="checkbox" checked={picked.includes(v)} onChange={() => toggle(v)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {picked.includes('other') ? (
          <input
            className="dc-addons__text"
            type="text"
            maxLength={200}
            placeholder="What else would you like? e.g. red carpet, two sofas"
            value={more}
            onChange={(e) => setMore(e.target.value)}
            aria-label="What else would you like"
          />
        ) : null}
      </fieldset>

      <div className="btn-row">
        {ready ? (
          <a className="btn btn--whatsapp" href={whatsappLink(whatsapp, message)} target="_blank" rel="noopener">
            Send on WhatsApp
          </a>
        ) : (
          <button type="button" className="btn btn--whatsapp" disabled>
            Send on WhatsApp
          </button>
        )}
      </div>
      {!ready ? <p className="muted dc-price__note">Answer the two venue questions to send.</p> : null}
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
