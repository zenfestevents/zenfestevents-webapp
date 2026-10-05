import React from 'react'
import Link from 'next/link'

import { rupees } from '../../lib/marketplaceOptions'
import type { PublicProduct } from '../../lib/shop'

/** Who sells it, in a few words — shown on every card so buyers know where they're buying. */
export function soldByLabel(p: PublicProduct) {
  if (p.source === 'affiliate') return `On ${p.merchant || 'partner store'}`
  if (p.seller) return `By ${p.seller.businessName}`
  return 'Zenfest'
}

/** A product in a shop grid: photo, name, price vs MRP and who sells it. */
export function ProductCard({ product }: { product: PublicProduct }) {
  const img = product.images[0]
  return (
    <article className="sp-card">
      <Link href={`/shop/p/${product.slug}`} className="sp-card__link">
        <div className="sp-card__img">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.card} alt={img.alt || product.title} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="sp-card__noimg" aria-hidden="true" />
          )}
          {product.discount > 0 && <span className="sp-card__off">{product.discount}% off</span>}
        </div>
        <div className="sp-card__body">
          <p className="sp-card__type">{product.typeLabel}</p>
          <h3 className="sp-card__title">{product.title}</h3>
          <p className="sp-card__price">
            <strong>{rupees(product.price)}</strong>
            {product.discount > 0 && <s className="muted">{rupees(product.mrp)}</s>}
          </p>
          <p className={`sp-card__by sp-card__by--${product.source}`}>{soldByLabel(product)}</p>
        </div>
      </Link>
    </article>
  )
}
