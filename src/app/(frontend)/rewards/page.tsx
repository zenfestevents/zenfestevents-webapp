import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'
import type { Metadata } from 'next'

import { FEATURES } from '../../../lib/features'
import { getRewardSettings } from '../../../lib/rewards'
import { SCORING, type RewardTier, type RunsKind } from '../../../lib/rewardTiers'
import { getSessionUser } from '../../../lib/session'
import { BallDots, TierBadge } from '../../../components/game'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/rewards' },
  title: 'Runs club — rewards for couples and vendors',
  description:
    'Join the Zenfest Runs club: earn runs when you plan, book and invite friends, climb from Debut to Hall of Fame and unlock money off your next event.',
}

const inr = (n: number) => n.toLocaleString('en-IN')

/**
 * The Runs club explained (lib/rewards.ts): how to score, the levels and what they
 * unlock, for couples and for vendors. Accounts exist only while the marketplace is
 * open, so the page goes with it.
 */
export default async function RewardsPage() {
  if (!FEATURES.marketplace) notFound()
  const [settings, user] = await Promise.all([getRewardSettings(), getSessionUser().catch(() => null)])
  const home =
    user?.collection === 'customers' ? '/account?tab=scorecard' : user?.collection === 'vendors' ? '/vendors/dashboard?tab=scorecard' : null

  return (
    <>
      <section className="section">
        <div className="container">
          <header className="page-head">
            <p className="eyebrow">Runs club</p>
            <h1 className="display-l">
              Score runs, unlock <span className="accent">rewards</span>
            </h1>
            <p className="lede">
              Every time you plan, book or bring a friend to Zenfest, you score runs. Climb the levels and your next
              event costs less. It&apos;s free to join.
            </p>
            <div className="btn-row rewards__cta">
              {home ? (
                <Link className="btn btn--primary" href={home}>
                  See my scorecard
                </Link>
              ) : (
                <>
                  <Link className="btn btn--primary" href="/account/signup">
                    Join free with WhatsApp
                  </Link>
                  <Link className="btn btn--outline-gold" href="/vendors/signup">
                    I&apos;m a vendor
                  </Link>
                </>
              )}
            </div>
            {!home && (
              <p className="muted rewards__login">
                Already a member? <Link className="accent" href="/account/login">Log in</Link>
              </p>
            )}
          </header>

          <ol className="rewards-steps">
            {[
              ['Join', 'Sign up with your WhatsApp number. That’s your first runs on the board.'],
              ['Score', 'Plan an event, book with us and invite friends. Each one adds runs.'],
              ['Level up', 'Pass each mark on the ladder to unlock the next level and its perks.'],
              ['Save', 'Your level’s discount comes off when our team quotes your next event.'],
            ].map(([title, body], i) => (
              <li key={title} className="rewards-step card">
                <BallDots total={4} done={i + 1} current={i} />
                <h2 className="rewards-step__title">{title}</h2>
                <p className="muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Ladder
        kind="c"
        eyebrow="For couples and families"
        title="The couples' ladder"
        tiers={settings.coupleTiers}
        scoring={SCORING.c.map((s) => ({ label: s.label, runs: settings.runsPer[s.reason] }))}
      />
      <Ladder
        kind="v"
        eyebrow="For vendors"
        title="The vendors' ladder"
        tiers={settings.vendorTiers}
        scoring={SCORING.v.map((s) => ({ label: s.label, runs: settings.runsPer[s.reason] }))}
        ink
      />

      <section className="section--tight band-soft">
        <div className="container home-runs__inner">
          <div>
            <p className="eyebrow">Refer &amp; earn</p>
            <h2 className="display-m">
              Bring your friends, and your <span className="accent">vendors</span>
            </h2>
            <p className="lede">
              Invite people planning an event and vendors who want work. Follow each invite live and score +
              {inr(settings.runsPer.referral)} when a client books, +{inr(settings.runsPer.referral_vendor)} when a vendor
              is approved.
            </p>
          </div>
          <Link className="btn btn--primary" href="/refer">
            Invite and track
          </Link>
        </div>
      </section>

      <section className="section--tight">
        <div className="container rewards-terms">
          <h2 className="display-s">The small print</h2>
          <ul className="muted">
            <li>Runs are loyalty points. They can&apos;t be bought, sold or swapped for cash, and they have no cash value.</li>
            <li>Nothing here is a game of chance: runs come only from the actions listed above.</li>
            <li>Each action scores once where it says so (your first enquiry, each booking, each friend who books).</li>
            <li>Your level&apos;s discount is applied by our team when we quote your next event. It can&apos;t be combined with other offers unless we say so.</li>
            <li>Zenfest Events may change how many runs an action is worth, the levels or the perks. Runs you have already scored stay yours.</li>
          </ul>
        </div>
      </section>
    </>
  )
}

function Ladder({
  kind,
  eyebrow,
  title,
  tiers,
  scoring,
  ink = false,
}: {
  kind: RunsKind
  eyebrow: string
  title: string
  tiers: RewardTier[]
  scoring: { label: string; runs: number }[]
  ink?: boolean
}) {
  return (
    <section className={`section ${ink ? 'band-ink' : ''}`} aria-labelledby={`ladder-${kind}`}>
      <div className="container">
        <div className="section-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="display-l" id={`ladder-${kind}`}>
              {title}
            </h2>
          </div>
        </div>
        <ol className="tier-cards">
          {tiers.map((t, i) => (
            <li key={t.name} className="tier-card">
              <TierBadge level={i + 1} name={t.name} />
              <p className="tier-card__min mono">{i === 0 ? 'Start here' : `From ${inr(t.minRuns)} runs`}</p>
              {t.rupeesOff > 0 && <p className="tier-card__off">₹{inr(t.rupeesOff)} off</p>}
              <p className="muted">{t.perks}</p>
            </li>
          ))}
        </ol>
        <h3 className="scorecard__title">How to score</h3>
        <ul className="score-list score-list--wide">
          {scoring
            .filter((s) => s.runs > 0)
            .map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <span className="score-list__runs mono">+{inr(s.runs)}</span>
              </li>
            ))}
        </ul>
      </div>
    </section>
  )
}
