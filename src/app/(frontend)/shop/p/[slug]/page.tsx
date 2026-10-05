import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AddToRegistry } from '../../../../../components/shop/AddToRegistry'
import { ProductCard, soldByLabel } from '../../../../../components/shop/ProductCard'
import { ProductGallery } from '../../../../../components/shop/ProductGallery'
import { rupees } from '../../../../../lib/marketplaceOptions'
import { getPublicProduct, listProducts } from '../../../../../lib/shop'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getPublicProduct((await params).slug)
  if (!product) return {}
  return {
    title: `${product.title} — Zenfest Shop`,
    description: product.description.slice(0, 160) || `${product.typeLabel} for ${product.occasionLabels.join(', ')}.`,
    openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getPublicProduct((await params).slug)
  if (!product) notFound()
  const related = (await listProducts({ occasion: product.occasions[0], limit: 9 }))
    .filter((p) => p.id !== product.id)
    .slice(0, 4)
  const affiliate = product.source === 'affiliate'

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow sp-crumbs">
          <Link href="/shop">Zenfest Shop</Link>
          {product.occasions[0] && (
            <>
              {' / '}
              <Link href={`/shop/${product.occasions[0]}`}>{product.occasionLabels[0]}</Link>
            </>
          )}
        </p>

        <div className="sp-product">
          <ProductGallery images={product.images} title={product.title} />

          <div className="sp-product__info">
            <p className="sp-card__type">{product.typeLabel}</p>
            <h1 className="display-m">{product.title}</h1>
            <p className="sp-product__price">
              <strong>{rupees(product.price)}</strong>
              {product.discount > 0 && (
                <>
                  <s className="muted">{rupees(product.mrp)}</s>
                  <span className="sp-card__off sp-card__off--inline">{product.discount}% off</span>
                </>
              )}
            </p>
            {affiliate && <p className="muted sp-product__pricenote">Price on {product.merchant || 'the store'} may change.</p>}

            <div className="sp-product__actions">
              {affiliate ? (
                <a
                  className="btn btn--primary"
                  href={`/shop/go/${product.id}`}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                >
                  Buy on {product.merchant || 'partner store'} ↗
                </a>
              ) : product.seller ? (
                <Link className="btn btn--primary" href={`/marketplace/v/${product.seller.slug}`}>
                  Order from {product.seller.businessName}
                </Link>
              ) : null}
              <AddToRegistry productId={product.id} />
            </div>

            <dl className="sp-soldby card">
              <div>
                <dt>Sold by</dt>
                <dd>
                  {affiliate ? (
                    <>
                      {product.merchant || 'Partner store'} <span className="muted">(you buy on their site)</span>
                    </>
                  ) : product.seller ? (
                    <Link href={`/marketplace/v/${product.seller.slug}`}>{product.seller.businessName}</Link>
                  ) : (
                    soldByLabel(product)
                  )}
                </dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>
                  {affiliate
                    ? `By ${product.merchant || 'the store'}, as shown at checkout`
                    : `${product.shipsTo === 'india' ? 'All over India' : 'Within the seller’s state'}${
                        product.dispatchDays != null ? ` · ships in ${product.dispatchDays || 1} day${product.dispatchDays > 1 ? 's' : ''}` : ''
                      }`}
                  {!product.inStock && <strong className="sp-soldby__out"> · Out of stock</strong>}
                </dd>
              </div>
              <div>
                <dt>Returns</dt>
                <dd>{affiliate ? `${product.merchant || 'The store'}’s return policy applies` : product.returnPolicy || 'Ask the seller before ordering'}</dd>
              </div>
              <div>
                <dt>Good for</dt>
                <dd>
                  {product.occasions.map((o, i) => (
                    <React.Fragment key={o}>
                      {i > 0 && ', '}
                      <Link href={`/shop/${o}`}>{product.occasionLabels[i]}</Link>
                    </React.Fragment>
                  ))}
                </dd>
              </div>
            </dl>

            {product.description && <div className="sp-product__desc">{product.description}</div>}
            {affiliate && (
              <p className="sp-disclosure sp-disclosure--light">
                Zenfest may earn a small commission when you buy through this link, at no extra cost to you.
              </p>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <>
            <div className="mk-section-head">
              <h2 className="display-m">More for {product.occasionLabels[0]}</h2>
              <Link href={`/shop/${product.occasions[0]}`} className="link-arrow">
                See all →
              </Link>
            </div>
            <div className="sp-grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
