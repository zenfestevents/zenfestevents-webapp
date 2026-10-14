import Link from 'next/link'
import React from 'react'

import { getSiteSettings } from '../lib/getSettings'
import { comingSoon, type ComingSoonKey } from '../lib/features'
import { DEFAULT_WA_MESSAGE, whatsappLink } from '../lib/site'
import { KolamRosette } from './Kolam'

/**
 * The page a switched-off feature shows (see FEATURES in lib/features.ts): what's
 * coming, and the two things a visitor can do today — the event form or WhatsApp.
 */
export async function ComingSoon({
  feature,
  title,
  body,
}: {
  feature: ComingSoonKey
  /** Overrides the feature's own title / blurb, e.g. on the vendor sign-up pages. */
  title?: string
  body?: string
}) {
  const f = comingSoon(feature)
  const settings = await getSiteSettings()
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)
  return (
    <section className="section">
      <div className="container">
        <div className="coming-soon coming-soon--page">
          <KolamRosette size={300} className="coming-soon__kolam" />
          <p className="eyebrow">{f.label} · Coming soon</p>
          <h1 className="display-l">{title ?? f.title}</h1>
          <p className="lede">{body ?? f.body}</p>
          <p className="muted">We&apos;re putting the finishing touches on it. Until then, our team plans it with you.</p>
          <div className="btn-row">
            <Link className="btn btn--primary" href="/enquire">
              Plan your event
            </Link>
            {settings?.contact?.whatsapp && (
              <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                WhatsApp us
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
