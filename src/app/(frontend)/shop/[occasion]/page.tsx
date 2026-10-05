import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { param, type SearchParams } from '../../../../components/market/AuthShell'
import { ProductCard } from '../../../../components/shop/ProductCard'
import { listProducts, type ProductFilters } from '../../../../lib/shop'
import { PRODUCT_TYPES, SHOP_OCCASIONS, isOccasion, isProductType } from '../../../../lib/shopOptions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ occasion: string }>; searchParams: SearchParams }

const SORTS = [
  ['featured', 'Zenfest picks'],
  ['new', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
] as const

const titleFor = (occasion: string) =>
  occasion === 'all' ? 'All products' : `${SHOP_OCCASIONS.find(([v]) => v === occasion)?.[1]} shopping`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occasion } = await params
  if (occasion !== 'all' && !isOccasion(occasion)) return {}
  const blurb = SHOP_OCCASIONS.find(([v]) => v === occasion)?.[2]
  return {
    title: `${titleFor(occasion)} — Zenfest Shop`,
    description: blurb ? `${blurb}. Picked for Indian functions by Zenfest Events.` : undefined,
  }
}

export default async function OccasionPage({ params, searchParams }: Props) {
  const { occasion } = await params
  if (occasion !== 'all' && !isOccasion(occasion)) notFound()
  const sp = await searchParams
  const type = param(sp.type)
  const sort = (SORTS.find(([v]) => v === param(sp.sort))?.[0] ?? 'featured') as ProductFilters['sort']
  const products = await listProducts({
    occasion: occasion === 'all' ? undefined : occasion,
    type: isProductType(type) ? type : undefined,
    sort,
  })
  const href = (next: { type?: string; sort?: string }) => {
    const q = new URLSearchParams()
    const t = next.type ?? type
    const s = next.sort ?? sort
    if (t) q.set('type', t)
    if (s && s !== 'featured') q.set('sort', s)
    const qs = q.toString()
    return `/shop/${occasion}${qs ? `?${qs}` : ''}`
  }

  return (
    <section className="section">
      <div className="container">
        <header className="page-head sp-head">
          <p className="eyebrow">
            <Link href="/shop">Zenfest Shop</Link>
          </p>
          <h1 className="display-l">{titleFor(occasion)}</h1>
        </header>

        <nav className="sp-chips" aria-label="Occasion">
          <Link className={`sp-chip ${occasion === 'all' ? 'is-active' : ''}`} href="/shop/all">
            All
          </Link>
          {SHOP_OCCASIONS.map(([v, label]) => (
            <Link key={v} className={`sp-chip ${occasion === v ? 'is-active' : ''}`} href={`/shop/${v}`}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sp-filters">
          <nav className="sp-chips sp-chips--small" aria-label="Product type">
            <Link className={`sp-chip ${!type ? 'is-active' : ''}`} href={href({ type: '' })}>
              Everything
            </Link>
            {PRODUCT_TYPES.map(([v, label]) => (
              <Link key={v} className={`sp-chip ${type === v ? 'is-active' : ''}`} href={href({ type: v })}>
                {label}
              </Link>
            ))}
          </nav>
          <nav className="sp-sort" aria-label="Sort">
            {SORTS.map(([v, label]) => (
              <Link key={v} className={sort === v ? 'is-active' : ''} href={href({ sort: v })}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {products.length ? (
          <div className="sp-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="sp-empty card">
            <h2 className="display-m">Nothing here yet</h2>
            <p className="muted">We&apos;re adding products for this occasion. Try another one, or see everything in the shop.</p>
            <Link className="btn btn--primary" href="/shop/all">
              See all products
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
