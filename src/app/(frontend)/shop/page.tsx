import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { KolamDivider } from '../../../components/Kolam'
import { ProductCard } from '../../../components/shop/ProductCard'
import { listProducts, occasionCounts } from '../../../lib/shop'
import { SHOP_OCCASIONS } from '../../../lib/shopOptions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Zenfest Shop — decor, props & return gifts for every function',
  description:
    'Haldi, mehendi, sangeet, wedding, birthday and baby-shower decor, props, return gifts and outfits — picked for Indian events, with a free gift registry.',
}

const HOW = [
  ['Picked for events', 'Only things you need for a function — no endless scrolling through phone cases.'],
  ['Clear about who sells', 'Every item shows if it ships from a partner store or a Zenfest seller, with their returns policy.'],
  ['Gift registry built in', 'Add any product to your registry and share one link with your guests.'],
] as const

export default async function ShopPage() {
  const [{ byOccasion: counts, total }, featured, latest] = await Promise.all([
    occasionCounts(),
    listProducts({ sort: 'featured', limit: 12 }),
    listProducts({ sort: 'new', limit: 8 }),
  ])
  const picks = featured.filter((p) => p.featured).slice(0, 8)
  const grid = picks.length ? picks : featured.slice(0, 8)

  return (
    <>
      <section className="section mk-hero sp-hero">
        <div className="container">
          <p className="eyebrow">Zenfest Shop</p>
          <h1 className="display-l">
            Everything for the <span className="accent">function</span>
          </h1>
          <p className="lede">
            Decor, props, return gifts and outfits for haldi, mehendi, sangeet, the wedding and every celebration after
            — plus a free gift registry for your guests.
          </p>
          <div className="btn-row">
            <Link className="btn btn--gold" href="/shop/all">
              Shop all
            </Link>
            <Link className="btn btn--ghost sp-hero__ghost" href="/registry">
              Make a gift registry
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <h2 className="display-m">Shop by occasion</h2>
          <ul className="mk-cats">
            {SHOP_OCCASIONS.map(([v, label, blurb]) => (
              <li key={v}>
                <Link href={`/shop/${v}`} className="mk-cat">
                  <strong>{label}</strong>
                  <span className="muted">{blurb}</span>
                  <span className="mk-cat__count">
                    {counts[v] ? `${counts[v]} item${counts[v] > 1 ? 's' : ''}` : 'Coming soon'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {grid.length > 0 ? (
            <>
              <div className="mk-section-head">
                <h2 className="display-m">{picks.length ? 'Zenfest picks' : 'In the shop'}</h2>
                <Link href="/shop/all" className="link-arrow">
                  See all {total ? `${total} ` : ''}→
                </Link>
              </div>
              <div className="sp-grid">
                {grid.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {picks.length > 0 && latest.length > 0 && (
                <>
                  <div className="mk-section-head">
                    <h2 className="display-m">Just added</h2>
                  </div>
                  <div className="sp-grid">
                    {latest.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="sp-empty card">
              <h2 className="display-m">The shelves are being stocked</h2>
              <p className="muted">
                Our team is picking the first decor, props and return gifts. Meanwhile you can make a gift registry with
                links from any store.
              </p>
              <Link className="btn btn--primary" href="/registry">
                Make a gift registry
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section section--tight band-ink">
        <div className="container">
          <h2 className="display-m">
            One place for the <span className="accent">whole function</span>
          </h2>
          <div className="promise-grid">
            {HOW.map(([t, body]) => (
              <div key={t} className="promise">
                <strong>{t}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <KolamDivider />
          <div className="mk-lanes">
            <div>
              <h3>Sell event products?</h3>
              <p>Return gifts, decor, outfits or props — list them on Zenfest and reach families planning functions.</p>
              <Link className="btn btn--gold" href="/vendors">
                Become a seller
              </Link>
            </div>
            <div>
              <h3>Need the whole event planned?</h3>
              <p>Our planners handle decor, vendors and the day itself.</p>
              <Link className="btn btn--ghost" href="/contact">
                Talk to a planner
              </Link>
            </div>
          </div>
          <p className="sp-disclosure">
            Some products are sold on partner stores such as Amazon or Flipkart. When you buy through our link, Zenfest
            may earn a small commission at no extra cost to you. <Link href="/shop/policies">Shop policies</Link>
          </p>
        </div>
      </section>
    </>
  )
}
