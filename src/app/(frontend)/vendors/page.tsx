import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { VendorPaths } from '../../../components/VendorPaths'
import { FEATURES } from '../../../lib/features'
import { getVendor } from '../../../lib/session'

// Reads the session at request time (a logged-in vendor gets a dashboard link).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'For Vendors — partner with Zenfest or list on the marketplace',
  description:
    'Two ways to work with Zenfest Events: join our vendor team for the events we plan, or list your business free on the Zenfest Marketplace.',
}

/** Two different kinds of vendor, kept apart on purpose (see components/VendorPaths.tsx). */
export default async function VendorsPage() {
  // One way to join while the marketplace is closed (see VENDORS_HREF).
  if (!FEATURES.marketplace) redirect('/vendors/partner')
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

        <VendorPaths hasListing={Boolean(vendor)} />
      </div>
    </section>
  )
}
