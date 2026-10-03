import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { KolamDivider } from '../../../components/Kolam'
import { SearchBar } from '../../../components/market/SearchBar'
import { VendorCard } from '../../../components/market/VendorCard'
import { categoryCounts, listVendors } from '../../../lib/marketplace'
import { MARKET_CATEGORIES } from '../../../lib/marketplaceOptions'
import { getCustomer } from '../../../lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Wedding & Event Vendor Marketplace — Chennai',
  description:
    'Find photographers, makeup artists, decorators, caterers, cake makers and halls in Chennai with prices upfront. Every vendor is reviewed by Zenfest.',
}

const WHY = [
  ['Prices upfront', 'Every listing has an all-in price card. No "price on request", no surprises.'],
  ['Checked by Zenfest', 'Our team reviews each vendor before they go live.'],
  ['Real availability', 'Search by your date — vendors who are booked drop out.'],
  ['DIY or done-for-you', 'Book vendors yourself, or hand your shortlist to our planners any time.'],
] as const

export default async function MarketplacePage() {
  const [counts, latest, customer] = await Promise.all([categoryCounts(), listVendors({ sort: 'new' }), getCustomer()])
  const saved = new Set((customer?.shortlist ?? []).map((s) => (typeof s === 'object' ? s.id : s)))
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <>
      <section className="section mk-hero">
        <div className="container">
          <p className="eyebrow">Zenfest marketplace</p>
          <h1 className="display-l">
            Book your event vendors <span className="accent">directly</span>
          </h1>
          <p className="lede">
            Photographers, makeup artists, decorators, caterers and halls across Chennai — with real prices and dates,
            checked by the Zenfest team.
          </p>
          <SearchBar />
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <h2 className="display-m">Browse by service</h2>
          <ul className="mk-cats">
            {MARKET_CATEGORIES.map(([v, label, blurb]) => (
              <li key={v}>
                <Link href={`/marketplace/${v}`} className="mk-cat">
                  <strong>{label}</strong>
                  <span className="muted">{blurb}</span>
                  <span className="mk-cat__count">{counts[v] ? `${counts[v]} vendor${counts[v] > 1 ? 's' : ''}` : 'Coming soon'}</span>
                </Link>
              </li>
            ))}
          </ul>

          {latest.length > 0 && (
            <>
              <div className="mk-section-head">
                <h2 className="display-m">New on Zenfest</h2>
                <Link href="/marketplace/all" className="link-arrow">
                  See all {total} →
                </Link>
              </div>
              <div className="mk-grid">
                {latest.slice(0, 8).map((v) => (
                  <VendorCard key={v.id} vendor={v} shortlisted={saved.has(v.id)} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section section--tight band-ink">
        <div className="container">
          <h2 className="display-m">
            Plan it smart, <span className="accent">not expensive</span>
          </h2>
          <div className="promise-grid">
            {WHY.map(([t, body]) => (
              <div key={t} className="promise">
                <strong>{t}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <KolamDivider />
          <div className="mk-lanes">
            <div>
              <h3>Want us to plan it instead?</h3>
              <p>Our planners handle everything — vendors, budget and the day itself.</p>
              <Link className="btn btn--gold" href="/contact">
                Talk to a planner
              </Link>
            </div>
            <div>
              <h3>Are you a vendor?</h3>
              <p>List your business free. No packages, no lock-in.</p>
              <Link className="btn btn--ghost" href="/vendors">
                List your business
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
