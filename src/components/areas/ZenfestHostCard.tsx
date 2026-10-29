import Link from 'next/link'
import React from 'react'

import type { AreaService } from '../../lib/areaPages'
import { nearestBase, placeName, type Place } from '../../lib/locations'
import { DEFAULT_WA_MESSAGE, SITE_FALLBACK, whatsappLink, type SiteSettings } from '../../lib/site'

/**
 * Zenfest itself, pinned first on every page in the direct zone (Chennai, Tambaram, Avadi,
 * Kanchipuram), where its own team runs the events. Real numbers only: the Google rating
 * from Site Settings and the distance to the nearest Zenfest base.
 */
export function ZenfestHostCard({
  service,
  place,
  settings,
}: {
  service: AreaService
  place: Place
  settings: SiteSettings
}) {
  const reviews = { ...SITE_FALLBACK.reviews, ...(settings.reviews || {}) }
  const wa = whatsappLink(settings.contact?.whatsapp || SITE_FALLBACK.contact.whatsapp, DEFAULT_WA_MESSAGE)
  const base = nearestBase(place)
  const name = placeName(place)
  return (
    <article className="ar-host">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/emblem.webp" alt="" className="ar-host__mark" width={72} height={72} loading="lazy" />
      <div className="ar-host__body">
        <p className="ar-host__badge">✓ Verified Premium Host</p>
        <h2 className="ar-host__name">Zenfest Events</h2>
        <p className="ar-host__meta muted">
          Zenfest&apos;s own team ·{' '}
          {base.km < 2 ? `our ${base.name} base is right here` : `${base.km} km from our ${base.name} base`}
          {reviews.googleRating && reviews.googleCount ? (
            <>
              {' · '}
              <a href={reviews.googleUrl || undefined} target="_blank" rel="noopener">
                ★ {reviews.googleRating.toFixed(1)} on Google ({reviews.googleCount} reviews)
              </a>
            </>
          ) : null}
        </p>
        <p>
          Zenfest Events {service.zenfest} in {name}: one team, one quote, no juggling vendors.
        </p>
        <div className="btn-row">
          <Link className="btn btn--gold" href={service.event ? `/enquire?event=${service.event}` : '/enquire'}>
            Plan your event
          </Link>
          <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  )
}
