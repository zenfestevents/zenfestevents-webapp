import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { SeamDivider } from '../../../../components/game'
import { MARKET_CATEGORIES } from '../../../../lib/marketplaceOptions'
import { getVendor } from '../../../../lib/session'
import { FEATURES } from '../../../../lib/features'
import { ComingSoon } from '../../../../components/ComingSoon'

// Read the session and the WhatsApp verification env at request time, not at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'List your business on the Zenfest Marketplace',
  description:
    'Photographers, makeup artists, decorators, caterers, bakers and halls — list your business free on the Zenfest marketplace and get real enquiries from couples across Tamil Nadu.',
}

const PROMISES = [
  ['Free to list', 'No ₹50,000 packages, no 12-month lock-in. Listing on Zenfest costs nothing.'],
  ['Only real couples', 'Every enquiry comes from a logged-in couple with their date, guests, area and budget.'],
  ['Prices that filter for you', 'Your price card is public, so the people who call can afford you.'],
  ['Your leads are yours', 'Enquiries go straight to you. Zenfest never redirects a marketplace couple to its own planning service.'],
  ['A team that answers', 'Zenfest is a Tamil Nadu event company — we review every listing and pick up the phone.'],
] as const

const STEPS = [
  ['Create your account', 'Name, business, phone and a password. Two minutes.'],
  ['Build your listing', 'Write about your work, add an all-in price card, upload photos and block booked dates.'],
  ['We review it', 'Our team checks every listing (usually within 2 working days) and puts it live.'],
  ['Get enquiries', 'Reply from your dashboard, send a quote, and mark the date booked.'],
] as const

/** The marketplace lane for vendors: a free listing that couples contact directly. */
export default async function VendorMarketplacePage() {
  if (!FEATURES.marketplace) {
    return (
      <ComingSoon
        feature="marketplace"
        title="Marketplace listings open soon"
        body="A free listing where couples see your prices and contact you directly — your leads stay yours. Want to work on events Zenfest plans? Apply as a Zenfest partner from the For Vendors page."
      />
    )
  }
  const vendor = await getVendor()

  return (
    <>
      <section className="section vendor-hero">
        <div className="container vendor-hero__inner">
          <p className="eyebrow">For vendors</p>
          <h1 className="display-l">
            List your business on the <span className="accent">Zenfest marketplace</span>
          </h1>
          <p className="lede">
            Couples across Tamil Nadu are planning smarter — comparing real prices and booking direct. Put your work in front
            of them, free.
          </p>
          <div className="btn-row">
            {vendor ? (
              <Link className="btn btn--gold" href="/vendors/dashboard">
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn--gold" href="/vendors/signup">
                  Create a free vendor account
                </Link>
                <Link className="btn btn--ghost" href="/vendors/login">
                  Vendor log in
                </Link>
              </>
            )}
          </div>
          <ul className="vendor-hero__cats">
            {MARKET_CATEGORIES.filter(([v]) => v !== 'other').map(([v, label]) => (
              <li key={v}>{label}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <h2 className="display-m">Why vendors choose Zenfest</h2>
          <div className="promise-grid">
            {PROMISES.map(([t, body]) => (
              <div key={t} className="promise card">
                <strong>{t}</strong>
                <p className="muted">{body}</p>
              </div>
            ))}
          </div>
          <SeamDivider />
          <h2 className="display-m">How it works</h2>
          <ol className="steps">
            {STEPS.map(([t, body], i) => (
              <li key={t} className="step">
                <span className="step__n">{i + 1}</span>
                <div>
                  <strong>{t}</strong>
                  <p className="muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          {!vendor && (
            <div className="btn-row">
              <Link className="btn btn--primary" href="/vendors/signup">
                Get started — it&apos;s free
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
