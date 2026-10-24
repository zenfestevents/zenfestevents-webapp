import Link from 'next/link'
import React from 'react'

import { FEATURES } from '../lib/features'

/**
 * The two vendor lanes, shared by /vendors and the homepage. Kept apart on purpose:
 * - Partner: works on events Zenfest plans (/vendors/partner, the VendorForm application).
 * - Marketplace: a free public listing that couples contact directly (/vendors/marketplace).
 * While FEATURES.marketplace is off only the partner card shows (the owner didn't want
 * vendors choosing between two paths when one of them isn't open).
 */
export function VendorPaths({
  heading: H = 'h2',
  hasListing = false,
}: {
  /** h3 when the cards sit under a section heading (homepage). */
  heading?: 'h2' | 'h3'
  /** A logged-in vendor gets a dashboard link instead of "List your business". */
  hasListing?: boolean
}) {
  return (
    <div className={`vendor-paths ${FEATURES.marketplace ? '' : 'vendor-paths--single'}`}>
      <article className="vendor-path card">
        <p className="eyebrow">Partner with Zenfest</p>
        <H className="display-m">{FEATURES.marketplace ? 'Zenfest brings you work' : 'Partner with Zenfest'}</H>
        <p className="muted">
          Join our vendor team. We plan weddings, birthdays and celebrations across Tamil Nadu and bring you in when
          an event suits your work — we coordinate the client, you focus on delivery.
        </p>
        <ul className="vendor-path__points">
          <li>Steady work from events we plan</li>
          <li>One point of contact for every event</li>
          <li>Photographers, videographers and bakers</li>
        </ul>
        <div className="btn-row">
          <Link className="btn btn--primary" href="/vendors/partner">
            Apply as a partner
          </Link>
        </div>
      </article>

      {FEATURES.marketplace && (
      <article className="vendor-path card">
        <p className="eyebrow">Free marketplace listing</p>
        <H className="display-m">Couples book you directly</H>
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
          {hasListing ? (
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
      )}
    </div>
  )
}
