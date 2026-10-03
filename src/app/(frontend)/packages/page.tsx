import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { getPayloadClient } from '../../../lib/payload'
import { Reveal } from '../../../components/Reveal'
import { aiAvailable } from '../../../lib/ai/status'
import { getSiteSettings } from '../../../lib/getSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Packages',
  description:
    'Combined event packages from Zenfest Events — décor, catering, photography and DJ bundled for weddings, birthdays and corporate events.',
}

/**
 * The real packages aren't finalised yet, so the page shows a "coming soon"
 * panel instead of the demo data. The listing below is kept and working — flip
 * this to true once the packages are entered in the admin.
 */
const PACKAGES_READY = false

export default async function PackagesPage() {
  const ai = aiAvailable(await getSiteSettings())
  let packages: any[] = []
  if (PACKAGES_READY) {
    try {
      const payload = await getPayloadClient()
      const res = await payload.find({ collection: 'packages', depth: 1, limit: 50, sort: 'order' })
      packages = res.docs
    } catch {
      packages = []
    }
  }

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="eyebrow">Packages</p>
          <h1 className="display-l">
            Bundled for <span className="italic accent">value</span>, built for you
          </h1>
          <p className="lede">
            Popular combinations to make planning simple. Every package can be adjusted —
            add, remove or scale to fit your day and budget.
          </p>
        </header>

        {packages.length > 0 ? (
          <div className="pkg-grid pkg-grid--full">
            {packages.map((p: any, i: number) => (
              <Reveal key={p.id} className="pkg-card card" delay={i * 60}>
                {p.featured && <span className="pkg-card__badge">Popular</span>}
                <h2 className="pkg-card__title">{p.title}</h2>
                {p.tagline && <p className="muted">{p.tagline}</p>}
                {Array.isArray(p.includedServices) && p.includedServices.length > 0 && (
                  <p className="pkg-card__includes">
                    {p.includedServices.map((s: any) => s?.title).filter(Boolean).join(' · ')}
                  </p>
                )}
                {Array.isArray(p.highlights) && (
                  <ul className="pkg-card__list">
                    {p.highlights.map((h: any, j: number) => (
                      <li key={j}>{h.item}</li>
                    ))}
                  </ul>
                )}
                {p.priceNote && <p className="pkg-card__price">{p.priceNote}</p>}
                <Link className="btn btn--primary" href="/contact">
                  Enquire about {p.title}
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="pkg-soon">
            <div className="pkg-soon__note">
              <p className="eyebrow">Coming soon</p>
              <p className="lede">
                We&apos;re putting our packages together right now. Until then, here&apos;s how to
                plan — and a quote built around your event is usually the better fit anyway.
              </p>
            </div>
            <ul className="pkg-soon__ways">
              <li className="pkg-soon__way pkg-soon__way--main">
                <h2>Get a custom quote</h2>
                <p>Tell us the date, guests and what you need. Our team calls back with a plan and a price.</p>
                <Link className="btn btn--primary" href="/contact">
                  Get a custom quote
                </Link>
              </li>
              {ai && (
                <li className="pkg-soon__way">
                  <h2>Plan with Zenfest AI</h2>
                  <p>Describe your event and get an itemised estimate from our specialists in minutes.</p>
                  <Link className="link-arrow" href="/plan">
                    Start planning →
                  </Link>
                </li>
              )}
              <li className="pkg-soon__way">
                <h2>Book vendors yourself</h2>
                <p>Compare listed vendors with prices upfront and request quotes directly.</p>
                <Link className="link-arrow" href="/marketplace">
                  Browse the marketplace →
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
