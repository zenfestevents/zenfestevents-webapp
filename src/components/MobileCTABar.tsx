'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { SiteSettings } from '../lib/site'

/** Sticky bottom bar on mobile: Earn from events / Enquire / Enroll as a vendor, always within thumb reach. */
// `settings` is unused since WhatsApp left the bar; kept so layout.tsx needn't change.
export function MobileCTABar(_props: { settings: SiteSettings }) {
  const pathname = usePathname()
  // Registry pages have their own sticky bar (guest "Plan with Zenfest" banner) or none.
  if (pathname.startsWith('/r/') || pathname.startsWith('/dashboard/')) return null
  return (
    <div className="mobilebar" role="region" aria-label="Quick actions">
      <Link className="mobilebar__btn mobilebar__btn--earn" href="/earn">
        Earn from events
      </Link>
      <Link className="mobilebar__btn mobilebar__btn--enq" href="/contact">
        Enquire
      </Link>
      <Link className="mobilebar__btn mobilebar__btn--vendor" href="/vendors">
        Enroll as a vendor
      </Link>
    </div>
  )
}
