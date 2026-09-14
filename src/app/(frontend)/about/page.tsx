import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { SITE_FALLBACK } from '../../../lib/site'
import { getSiteSettings } from '../../../lib/getSettings'
import { KolamDivider } from '../../../components/Kolam'
import { Reveal } from '../../../components/Reveal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Zenfest Events is a full-service event management company near Chennai with branches in Guduvancheri and Thiruverkadu.',
}

const REASONS = [
  ['One coordinated team', 'Décor, catering, photography and music handled together — no juggling vendors.'],
  ['Local & reachable', 'Two branches on the GST Road corridor and at Thiruverkadu, a call or WhatsApp away.'],
  ['Every occasion', 'Weddings, birthdays, corporate functions, housewarmings and sports events.'],
  ['Built on referrals', 'Most of our work comes from families who saw an event we ran and called us.'],
]

export default async function AboutPage() {
  const settings = await getSiteSettings()
  const branches = settings?.branches?.length ? settings.branches : SITE_FALLBACK.branches

  return (
    <>
      <section className="section">
        <div className="container about-hero">
          <p className="eyebrow">About us</p>
          <h1 className="display-l">
            Calm planning, <span className="italic accent">joyful</span> celebrations
          </h1>
          <p className="lede">
            Zenfest Events is a full-service event management company near Chennai. From
            the first idea to the last guest leaving, we plan, style and run events across
            Tamil Nadu — so you can enjoy the day instead of managing it.
          </p>
        </div>
      </section>

      <section className="section--tight band-soft">
        <div className="container why-grid">
          {REASONS.map(([title, body], i) => (
            <Reveal key={title} className="why-card" delay={i * 60}>
              <h3 className="why-card__title">{title}</h3>
              <p className="muted">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <KolamDivider />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Find us</p>
              <h2 className="display-l">Two branches, near you</h2>
            </div>
          </div>
          <div className="branch-grid">
            {branches.map((b, i) => (
              <div key={b.id || i} className="branch-card card">
                <h3 className="branch-card__title">{b.name}</h3>
                {b.addressLine && <p className="muted">{b.addressLine}</p>}
                {b.mapUrl && (
                  <a href={b.mapUrl} target="_blank" rel="noopener" className="accent">
                    View on map →
                  </a>
                )}
              </div>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: '2rem' }}>
            <Link className="btn btn--primary" href="/contact">
              Get a callback
            </Link>
            <Link className="btn btn--ghost" href="/gallery">
              See our work
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
