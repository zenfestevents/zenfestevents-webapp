import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { param, type SearchParams } from '../../../../components/market/AuthShell'
import { SearchBar } from '../../../../components/market/SearchBar'
import { VendorCard } from '../../../../components/market/VendorCard'
import { listVendors, type VendorFilters } from '../../../../lib/marketplace'
import { MARKET_AREAS, MARKET_CATEGORIES, categoryLabel, isCategory, rupees } from '../../../../lib/marketplaceOptions'
import { getCustomer } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

type Params = Promise<{ category: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params
  if (category === 'all') return { title: 'All vendors — Zenfest marketplace' }
  if (!isCategory(category)) return {}
  const blurb = MARKET_CATEGORIES.find(([v]) => v === category)?.[2] ?? ''
  return {
    title: `${categoryLabel(category)} in Chennai — prices & availability`,
    description: `${blurb}. Compare ${categoryLabel(category).toLowerCase()} vendors in Chennai with prices upfront, checked by Zenfest Events.`,
  }
}

const SORTS = ['recommended', 'price-low', 'price-high', 'new'] as const

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { category } = await params
  const sp = await searchParams
  const cat = param(sp.cat)

  // The search bar submits to /marketplace/all?cat=… — send it to the category's own page.
  if (category === 'all' && isCategory(cat)) {
    const qs = new URLSearchParams()
    for (const k of ['area', 'date', 'budget', 'q', 'sort']) if (param(sp[k])) qs.set(k, param(sp[k]))
    redirect(`/marketplace/${cat}${qs.size ? `?${qs}` : ''}`)
  }
  if (category !== 'all' && !isCategory(category)) notFound()

  const area = MARKET_AREAS.includes(param(sp.area)) ? param(sp.area) : ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param(sp.date)) ? param(sp.date) : ''
  const budget = Number(param(sp.budget)) > 0 ? Math.round(Number(param(sp.budget))) : undefined
  const q = param(sp.q).trim().slice(0, 60)
  const sort = (SORTS as readonly string[]).includes(param(sp.sort))
    ? (param(sp.sort) as VendorFilters['sort'])
    : undefined

  const [vendors, customer] = await Promise.all([
    listVendors({ category: isCategory(category) ? category : undefined, area, date, budget, q, sort }),
    getCustomer(),
  ])
  const saved = new Set((customer?.shortlist ?? []).map((s) => (typeof s === 'object' ? s.id : s)))
  const title = category === 'all' ? 'All vendors' : categoryLabel(category)
  const filters = [
    area,
    date &&
      new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }),
    budget && `up to ${rupees(budget)}`,
    q && `“${q}”`,
  ].filter(Boolean)

  return (
    <section className="section section--tight mk-results">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/marketplace">Marketplace</Link> <span aria-hidden="true">/</span> <span>{title}</span>
        </nav>
        <h1 className="display-l">{title}</h1>
        <SearchBar
          compact
          category={isCategory(category) ? category : ''}
          area={area}
          date={date}
          budget={budget ? String(budget) : ''}
          q={q}
          sort={sort ?? ''}
        />
        <p className="muted mk-results__count">
          {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
          {filters.length ? ` · ${filters.join(' · ')}` : ''}
          {filters.length > 0 && (
            <>
              {' · '}
              <Link href={`/marketplace/${category}`}>Clear filters</Link>
            </>
          )}
        </p>
        {vendors.length ? (
          <div className="mk-grid">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} shortlisted={saved.has(v.id)} />
            ))}
          </div>
        ) : (
          <div className="mk-empty card">
            <h2 className="display-s">No vendors match yet</h2>
            <p className="muted">
              We&apos;re adding vendors across Chennai every week. Try another area or date — or tell our team what you
              need and we&apos;ll find someone for you.
            </p>
            <div className="btn-row">
              <Link className="btn btn--gold" href="/contact">
                Ask Zenfest to find one
              </Link>
              <Link className="btn btn--ghost" href="/marketplace">
                Back to marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
