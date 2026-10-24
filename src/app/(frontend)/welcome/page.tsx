import Link from 'next/link'
import { cookies } from 'next/headers'
import React from 'react'
import type { Metadata } from 'next'

import { FEATURES } from '../../../lib/features'
import { getSiteSettings } from '../../../lib/getSettings'
import { REF_COOKIE, getRewardSettings, inviterFirstName } from '../../../lib/rewards'
import { MAJOR_CITIES, SITE_FALLBACK } from '../../../lib/site'
import { Scoreboard, type ScoreItem } from '../../../components/game'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'You’re invited',
  description: 'Someone invited you to Zenfest Events — event management across Tamil Nadu.',
  robots: { index: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Where an invite link lands (/invite/<code> sets the cookie, then redirects here).
 * "{Name} invited you" — the inviter's first name only — with the client choices
 * (plan an event, join the Runs club) or, for `?for=vendor`, the vendor ones.
 */
export default async function WelcomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const forVendor = sp.for === 'vendor'
  const code = (await cookies()).get(REF_COOKIE)?.value
  const [name, settings, site] = await Promise.all([
    code ? inviterFirstName(code).catch(() => null) : null,
    getRewardSettings().catch(() => null),
    getSiteSettings(),
  ])
  const welcome = FEATURES.marketplace ? settings?.runsPer.welcome ?? 0 : 0
  const rating = { ...SITE_FALLBACK.reviews, ...(site?.reviews || {}) }
  const score: ScoreItem[] = [
    ...(rating.googleRating && rating.googleCount
      ? [
          { value: `${rating.googleRating.toFixed(1)}★`, label: 'Google rating' },
          { value: rating.googleCount, label: 'Google reviews' },
        ]
      : []),
    { value: MAJOR_CITIES.length, label: 'Major cities' },
  ]

  return (
    <section className="section welcome">
      <div className="container welcome__inner">
        <p className="eyebrow">{forVendor ? 'For vendors' : 'You’re invited'}</p>
        <h1 className="display-l">
          {name ? (
            <>
              <span className="accent">{name}</span> invited you to Zenfest Events
            </>
          ) : (
            <>
              You&apos;re invited to <span className="accent">Zenfest Events</span>
            </>
          )}
        </h1>
        <p className="lede">
          {forVendor
            ? 'We plan weddings, birthdays and celebrations across Tamil Nadu and bring vendors in on the events we run. Couples can also find and book you directly on our marketplace.'
            : 'We plan weddings, birthdays, baby showers and every kind of celebration across Tamil Nadu: décor, food, photos, music and the whole day, handled by one team.'}
        </p>

        {welcome > 0 && (
          <p className="welcome__bonus">
            <span className="mono">+{welcome}</span> welcome runs when you join the Runs club
          </p>
        )}

        <div className="welcome__choices">
          {forVendor ? (
            <>
              <Link className="welcome__choice card" href="/vendors/partner">
                <strong>Partner with Zenfest</strong>
                <span className="muted">Work on events we plan. We bring you the client.</span>
              </Link>
              {FEATURES.marketplace && (
                <Link className="welcome__choice card card--featured" href="/vendors/signup">
                  <strong>List free on the marketplace</strong>
                  <span>Couples find and book you directly.</span>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link className="welcome__choice card card--featured" href="/enquire">
                <strong>Plan your event</strong>
                <span>Tell us the date and what you need; we call you back with ideas and a quote.</span>
              </Link>
              {FEATURES.marketplace && (
                <Link className="welcome__choice card" href="/account/signup">
                  <strong>Join the Runs club</strong>
                  <span className="muted">Free. Score runs and save on your event.</span>
                </Link>
              )}
            </>
          )}
        </div>

        <p className="muted welcome__other">
          {forVendor ? (
            <>
              Planning an event instead? <Link className="accent" href="/welcome">See what we do for clients</Link>
            </>
          ) : (
            <>
              Are you a vendor? <Link className="accent" href="/welcome?for=vendor">Join Zenfest free</Link>
            </>
          )}
        </p>

        <Scoreboard items={score} className="welcome__score" />
      </div>
    </section>
  )
}
