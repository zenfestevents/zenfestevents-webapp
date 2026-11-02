import React from 'react'
import Link from 'next/link'

import type { PublicDecoration } from '../../lib/decorations'

/** A decoration in a grid: photo, code, title and what it is for. Prices live on the item page. */
export function DecorCard({ item }: { item: PublicDecoration }) {
  const img = item.photos[0]
  return (
    <article className="sp-card">
      <Link href={`/decorations/${item.slug}`} className="sp-card__link">
        <div className="sp-card__img">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.card} alt={img.alt || item.title} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="sp-card__noimg" aria-hidden="true" />
          )}
          {item.kind === 'package' && <span className="sp-card__off">Package</span>}
        </div>
        <div className="sp-card__body">
          <p className="sp-card__type">
            {item.eventLabel} · {item.categoryLabel}
          </p>
          <h3 className="sp-card__title">{item.title}</h3>
          <p className="dc-card__code">{item.code}</p>
        </div>
      </Link>
    </article>
  )
}
