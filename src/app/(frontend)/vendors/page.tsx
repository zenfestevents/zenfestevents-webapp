import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { FEATURES } from '../../../lib/features'
import { getVendor } from '../../../lib/session'

// Reads the session at request time (a logged-in vendor gets a dashboard link).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'For Vendors — partner with Zenfest or list on the marketplace',
  description:
    'Two ways to work with Zenfest Events: join our vendor team for the events we plan, or list your business free on the Zenfest Marketplace.',
}

/**
 * Two different kinds of vendor, kept apart on purpose:
 * - Partner: works on events Zenfest plans (/vendors/partner, the VendorForm application).
 * - Marketplace: a free public listing that couples contact directly (/vendors/marketplace).
 */
export default async function VendorsPage() {
  const vendor = FEATURES.marketplace ? await getVendor() : null

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="eyebrow">For vendors</p>
          <h1 className="display-l">
            Two ways to grow with <span className="accent">Zenfest</span>
          </h1>
          <p className="lede">
            Work on the events our team plans, or list your business for couples who book vendors themselves. They
            are separate — you can do one or both.
          </p>
        </header>

        <div className="vendor-paths">
          <article className="vendor-path card">
            <p className="eyebrow">Open now</p>
            <h2 className="display-m">Partner with Zenfest</h2>
            <p className="muted">
              Join our vendor team. We plan weddings, birthdays and celebrations across Tamil Nadu and bring you in when
              an event suits your work — we coordinate the client, you focus on delivery.
            </p>
            <ul className="vendor-path__points">
              <li>Steady work from events we plan</li>
              <li>One point of contact for every event</li>
              <li>Photographers, videographers, cake makers and more</li>
            </ul>
            <div className="btn-row">
              <Link className="btn btn--primary" href="/vendors/partner">
                Apply as a partner
              </Link>
            </div>
          </article>

          <article className={`vendor-path card ${FEATURES.marketplace ? '' : 'vendor-path--soon'}`}>
            <p className="eyebrow">{FEATURES.marketplace ? 'Free listing' : 'Coming soon'}</p>
            <h2 className="display-m">List on the Zenfest Marketplace</h2>
            <p className="muted">
              Your own listing with photos and an all-in price card. Couples who plan it themselves find you and
              contact you directly.
            </p>
            <ul className="vendor-path__points">
              <li>Free to list — no packages, no lock-in</li>
              <li>Enquiries only from real couples with a date and budget</li>
              <li>Your leads are yours — Zenfest never redirects them</li>
            </ul>
            <div className="btn-row">
              {!FEATURES.marketplace ? (
                <span className="pill pill--soon">Opening soon</span>
              ) : vendor ? (
                <Link className="btn btn--gold" href="/vendors/dashboard">
                  Go to your dashboard
                </Link>
              ) : (
                <Link className="btn btn--gold" href="/vendors/marketplace">
                  List your business free
                </Link>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
