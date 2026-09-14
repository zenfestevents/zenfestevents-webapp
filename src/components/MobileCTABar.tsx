import React from 'react'

import { telLink, whatsappLink, DEFAULT_WA_MESSAGE, type SiteSettings } from '../lib/site'

/** Sticky bottom bar on mobile so Call / WhatsApp are always within thumb reach. */
export function MobileCTABar({ settings }: { settings: SiteSettings }) {
  const phone = settings?.contact?.phonePrimary
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)

  return (
    <div className="mobilebar" role="region" aria-label="Quick contact">
      <a className="mobilebar__btn mobilebar__btn--call" href={phone ? telLink(phone) : '/contact'}>
        <span aria-hidden="true">📞</span> Call
      </a>
      <a
        className="mobilebar__btn mobilebar__btn--wa"
        href={wa}
        target="_blank"
        rel="noopener"
      >
        <span aria-hidden="true">💬</span> WhatsApp
      </a>
      <a className="mobilebar__btn mobilebar__btn--enq" href="/contact">
        Enquire
      </a>
    </div>
  )
}
