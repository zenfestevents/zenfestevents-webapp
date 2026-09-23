import Link from 'next/link'
import React from 'react'

import { whatsappLink, DEFAULT_WA_MESSAGE, type SiteSettings } from '../lib/site'

/** Sticky bottom bar on mobile: WhatsApp / Enquire / Enroll as a vendor, always within thumb reach. */
export function MobileCTABar({ settings }: { settings: SiteSettings }) {
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)

  return (
    <div className="mobilebar" role="region" aria-label="Quick actions">
      <a className="mobilebar__btn mobilebar__btn--wa" href={wa} target="_blank" rel="noopener">
        <svg className="mobilebar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3C7 3 3 6.6 3 11c0 2.2 1 4.2 2.7 5.6L5 21l4.3-2.2c.9.2 1.8.3 2.7.3 5 0 9-3.6 9-8s-4-8-9-8Z" />
        </svg>
        WhatsApp
      </a>
      <Link className="mobilebar__btn mobilebar__btn--enq" href="/contact">
        Enquire
      </Link>
      <Link className="mobilebar__btn mobilebar__btn--vendor" href="/vendors">
        Enroll as a vendor
      </Link>
    </div>
  )
}
