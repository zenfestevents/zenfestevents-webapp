import React from 'react'
import Link from 'next/link'

import type { PublicVendor } from '../../lib/marketplace'
import { ALL_CHENNAI, rupees, unitLabel } from '../../lib/marketplaceOptions'
import { ShortlistButton } from './ShortlistButton'

/** A vendor in a results grid: cover, name, service, areas and "from ₹" price. */
export function VendorCard({ vendor, shortlisted = false }: { vendor: PublicVendor; shortlisted?: boolean }) {
  const cheapest = vendor.priceCard.reduce<PublicVendor['priceCard'][number] | null>(
    (min, r) => (min == null || r.price < min.price ? r : min),
    null,
  )
  const areas = vendor.areas.includes(ALL_CHENNAI)
    ? 'All over Chennai'
    : vendor.areas.slice(0, 2).join(', ') + (vendor.areas.length > 2 ? ` +${vendor.areas.length - 2}` : '')
  return (
    <article className="mk-card">
      <Link href={`/marketplace/v/${vendor.slug}`} className="mk-card__link">
        <div className="mk-card__img">
          {vendor.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.cover.card} alt={vendor.cover.alt || vendor.businessName} loading="lazy" width={800} height={600} />
          ) : (
            <span className="mk-card__noimg" aria-hidden="true" />
          )}
        </div>
        <div className="mk-card__body">
          <p className="mk-card__service">{vendor.service}</p>
          <h3 className="mk-card__name">{vendor.businessName}</h3>
          {areas && <p className="mk-card__areas muted">{areas}</p>}
          <p className="mk-card__price">
            {cheapest ? (
              <>
                From <strong>{rupees(cheapest.price)}</strong> <span className="muted">{unitLabel(cheapest.unit)}</span>
              </>
            ) : (
              <span className="muted">Prices on the listing</span>
            )}
          </p>
          {vendor.phoneVerified && <span className="mk-card__badge">✓ Verified</span>}
        </div>
      </Link>
      <div className="mk-card__heart">
        <ShortlistButton slug={vendor.slug} initial={shortlisted} />
      </div>
    </article>
  )
}
