import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'
import type { Metadata } from 'next'

import { FEATURES } from '../../../lib/features'
import { CLIENT_STAGES, VENDOR_STAGES, getRewardSettings, referPageData } from '../../../lib/rewards'
import { getSessionUser } from '../../../lib/session'
import { BallDots, Scoreboard } from '../../../components/game'
import { InviteShare } from '../../../components/market/InviteShare'
import { ReferralTracker } from '../../../components/market/ReferralTracker'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Refer & earn — invite clients and vendors',
  description:
    'Invite friends planning an event and vendors who want event work. Follow each invite live and score Runs club runs when they join, book or are approved.',
  robots: { index: false },
}

const inr = (n: number) => n.toLocaleString('en-IN')

/**
 * Refer & earn: anyone (couple or vendor) invites clients and vendors, follows each
 * invite live and scores runs (lib/rewards.ts getReferrals / referPageData). Accounts
 * exist only while the marketplace is open, so the page goes with it.
 */
export default async function ReferPage() {
  if (!FEATURES.marketplace) notFound()
  const user = await getSessionUser().catch(() => null)
  const kind = user?.collection === 'customers' ? 'c' : user?.collection === 'vendors' ? 'v' : null

  if (!kind || !user) {
    const settings = await getRewardSettings()
    return (
      <section className="section">
        <div className="container">
          <header className="page-head">
            <p className="eyebrow">Refer &amp; earn</p>
            <h1 className="display-l">
              Bring your people, <span className="accent">score runs</span>
            </h1>
            <p className="lede">
              Invite friends who are planning an event, and vendors who want event work. Follow every invite live, and
              score runs in the Runs club when they join, book or are approved.
            </p>
            <div className="btn-row rewards__cta">
              <Link className="btn btn--primary" href="/account/signup">
                Join free with WhatsApp
              </Link>
              <Link className="btn btn--outline-gold" href="/vendors/signup">
                I&apos;m a vendor
              </Link>
            </div>
            <p className="muted rewards__login">
              Already a member? <Link className="accent" href="/account/login">Log in</Link> to get your links.
            </p>
          </header>
          <HowItWorks
            runs={{
              small: settings.runsPer.referral_signup,
              client: settings.runsPer.referral,
              vendor: settings.runsPer.referral_vendor,
              welcome: settings.runsPer.welcome,
            }}
          />
        </div>
      </section>
    )
  }

  const { referrals, links, runs, cap } = await referPageData(kind, user.id)
  const { opened, friends, totals } = referrals

  return (
    <>
      <section className="section">
        <div className="container">
          <header className="page-head">
            <p className="eyebrow">Refer &amp; earn</p>
            <h1 className="display-l">
              Your <span className="accent">invites</span>, live
            </h1>
            <p className="lede">
              Share a link with someone planning an event or a vendor who wants work. Watch each one move from
              &ldquo;opened your link&rdquo; to booked, and score runs at every big step.
            </p>
          </header>

          <Scoreboard
            items={[
              { value: inr(opened.total), label: 'Opened your link' },
              { value: inr(totals.joined), label: 'Joined or enquired' },
              { value: inr(totals.clientsBooked), label: 'Clients booked' },
              { value: inr(totals.vendorsApproved), label: 'Vendors approved' },
              { value: inr(totals.runs), label: 'Runs from invites' },
            ]}
          />

          <h2 className="display-s refer__title">Share your links</h2>
          {links ? <InviteShare links={links} runs={runs} /> : <p className="muted">Your links will appear here shortly.</p>}
        </div>
      </section>

      <section className="section band-ink">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live progress</p>
              <h2 className="display-m">Everyone you invited</h2>
            </div>
            <Link
              href={kind === 'v' ? '/vendors/dashboard?tab=scorecard' : '/account?tab=scorecard'}
              className="section-head__link"
            >
              My scorecard →
            </Link>
          </div>
          <ReferralTracker friends={friends} stages={{ client: CLIENT_STAGES, vendor: VENDOR_STAGES }} />
          <p className="muted refer__note">
            Names show as first name and initial only. {opened.client} opened your client link and {opened.vendor} your
            vendor link; people show up here by name once they join, enquire or apply.
          </p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <HowItWorks runs={runs} />
          <ul className="muted refer__terms">
            <li>
              The small award counts once per person, and at most {inr(cap)} times in any 30 days. Booked and approved
              awards have no limit.
            </li>
            <li>Inviting yourself, or your own number, doesn&apos;t count.</li>
            <li>Runs are loyalty points with no cash value. <Link className="accent" href="/rewards">How the Runs club works</Link></li>
          </ul>
        </div>
      </section>
    </>
  )
}

function HowItWorks({ runs }: { runs: { small: number; client: number; vendor: number; welcome: number } }) {
  const steps = [
    ['Share', 'Send your client link to friends planning an event, and your vendor link to vendors who want work.'],
    [
      'They join',
      `When they join, enquire or apply, you score +${inr(runs.small)}. People who join get +${inr(runs.welcome)} welcome runs too.`,
    ],
    [
      'Big runs',
      `A client you invited books: +${inr(runs.client)}. A vendor you invited is approved or goes live: +${inr(runs.vendor)}.`,
    ],
  ]
  return (
    <ol className="rewards-steps rewards-steps--3">
      {steps.map(([title, body], i) => (
        <li key={title} className="rewards-step card">
          <BallDots total={3} done={i + 1} current={i} />
          <h2 className="rewards-step__title">{title}</h2>
          <p className="muted">{body}</p>
        </li>
      ))}
    </ol>
  )
}
