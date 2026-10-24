'use client'

import React from 'react'
import Link from 'next/link'

import type { InviteLinks, Scorecard as ScorecardData } from '../../lib/rewards'
import { GoldRing, TierBadge } from '../game'
import { InviteShare } from './InviteShare'

const inr = (n: number) => n.toLocaleString('en-IN')

/**
 * The Runs club tab in the couple and vendor dashboards: the runs total in a gold ring,
 * the current level and what it unlocks, the ladder, how to score, the invite link and
 * the ball-by-ball history. Data comes from getScorecard() (lib/rewards.ts).
 */
export function Scorecard({
  card,
  links,
  scoring,
}: {
  card: ScorecardData
  /** Absolute client / vendor invite links, or null if the account has no code yet. */
  links: InviteLinks | null
  /** "How to score" rows with this account's run values. */
  scoring: { reason: string; label: string; runs: number }[]
}) {
  const level = card.tiers.findIndex((t) => t.name === card.tier.name) + 1
  const runsFor = (reason: string) => scoring.find((s) => s.reason === reason)?.runs ?? 0

  return (
    <div className="scorecard">
      <div className="scorecard__hero band-ink">
        <GoldRing progress={card.progress} size={148}>
          <span className="scorecard__total">{inr(card.total)}</span>
          <span className="scorecard__unit mono">runs</span>
        </GoldRing>
        <div className="scorecard__standing">
          <p className="eyebrow">Runs club</p>
          <TierBadge level={level} name={card.tier.name} />
          {card.tier.rupeesOff > 0 && (
            <p className="scorecard__off">₹{inr(card.tier.rupeesOff)} off</p>
          )}
          {card.tier.perks && <p className="muted">{card.tier.perks}</p>}
          <p className="scorecard__next mono">
            {card.next
              ? `${inr(card.toNext)} runs to ${card.next.name}`
              : 'Top of the table: the highest level'}
          </p>
        </div>
      </div>

      <h3 className="scorecard__title">The ladder</h3>
      <ol className="ladder">
        {card.tiers.map((t, i) => {
          const reached = card.total >= t.minRuns
          const current = t.name === card.tier.name
          return (
            <li key={t.name} className={`ladder__step ${reached ? 'is-reached' : ''} ${current ? 'is-current' : ''}`}>
              <span className="ladder__min mono">{i === 0 ? 'Start' : `${inr(t.minRuns)} runs`}</span>
              <strong className="ladder__name">{t.name}</strong>
              {t.rupeesOff > 0 && <span className="ladder__off">₹{inr(t.rupeesOff)} off</span>}
              {reached && i > 0 && <span className="ladder__unlocked">Unlocked</span>}
            </li>
          )
        })}
      </ol>

      <div className="scorecard__cols">
        <section>
          <h3 className="scorecard__title">How to score</h3>
          <ul className="score-list">
            {scoring.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <span className="score-list__runs mono">+{inr(s.runs)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="scorecard__invite">
          <h3 className="scorecard__title">Invite and score</h3>
          <p className="muted">
            Invite clients and vendors. You score when they join, and big when a client books or a vendor is approved.
          </p>
          {links ? (
            <InviteShare
              links={links}
              compact
              runs={{ small: runsFor('referral_signup'), client: runsFor('referral'), vendor: runsFor('referral_vendor') }}
            />
          ) : (
            <p className="muted">Your invite links will appear here shortly.</p>
          )}
          <Link className="link-arrow" href="/refer">
            Track your invites →
          </Link>
        </section>
      </div>

      <h3 className="scorecard__title">Ball by ball</h3>
      {card.rows.length ? (
        <ol className="ballbyball">
          {card.rows.map((r) => (
            <li key={r.id}>
              <time className="ballbyball__when mono" dateTime={r.createdAt}>
                {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </time>
              <span className="ballbyball__what">
                {r.label}
                {r.note && <span className="muted"> · {r.note}</span>}
              </span>
              <span className={`ballbyball__runs mono ${r.amount < 0 ? 'is-minus' : ''}`}>
                {r.amount < 0 ? '−' : '+'}
                {inr(Math.abs(r.amount))}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Yet to bat: your first runs will show up here.</p>
      )}

      <p className="scorecard__terms muted">
        Runs are loyalty points: they can&apos;t be bought and have no cash value. Your level&apos;s discount is applied
        by our team when we quote. <Link href="/rewards">How the Runs club works →</Link>
      </p>
    </div>
  )
}
