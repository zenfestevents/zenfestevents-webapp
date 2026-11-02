import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { DecorCard } from '../../../components/decor/DecorCard'
import { VenueNotice } from '../../../components/decor/StageQuestion'
import { param, type SearchParams } from '../../../components/market/AuthShell'
import { decorationCounts, listDecorations } from '../../../lib/decorations'
import {
  DECOR_CATEGORIES,
  DECOR_EVENT_GROUPS,
  DECOR_MATERIALS,
  DECOR_THEMES,
  categoryLabel,
  eventTypeLabel,
  isDecorCategory,
  isDecorEventType,
  isDecorMaterial,
  isDecorTheme,
  materialLabel,
} from '../../../lib/decorOptions'

// Reads the filters from the address, so this page is built per visit.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Decorations — stages, entrances, mandaps & more',
  description:
    'Browse wedding, reception, birthday, baby-shower and housewarming decorations by Zenfest Events across Tamil Nadu — stages, entrances, mandaps, backdrops, balloons, flowers and lighting.',
  alternates: { canonical: '/decorations' },
}

type Props = { searchParams: SearchParams }

export default async function DecorationsPage({ searchParams }: Props) {
  const sp = await searchParams
  const eventRaw = param(sp.event)
  const categoryRaw = param(sp.category)
  const themeRaw = param(sp.theme)
  const materialRaw = param(sp.material)
  const event = isDecorEventType(eventRaw) ? eventRaw : ''
  const category = isDecorCategory(categoryRaw) ? categoryRaw : ''
  const theme = isDecorTheme(themeRaw) ? themeRaw : ''
  const material = isDecorMaterial(materialRaw) ? materialRaw : ''
  const page = Math.max(1, Number.parseInt(param(sp.page), 10) || 1)

  const [counts, { items, total, pages }] = await Promise.all([
    decorationCounts(),
    listDecorations({ event, category, material, theme, page }),
  ])

  const href = (next: { event?: string; category?: string; material?: string; theme?: string; page?: number }) => {
    const q = new URLSearchParams()
    const e = next.event ?? event
    const c = next.category ?? category
    const m = next.material ?? material
    const t = next.theme ?? theme
    if (e) q.set('event', e)
    if (c) q.set('category', c)
    if (m) q.set('material', m)
    if (t) q.set('theme', t)
    if (next.page && next.page > 1) q.set('page', String(next.page))
    const qs = q.toString()
    return `/decorations${qs ? `?${qs}` : ''}`
  }

  const filtered = Boolean(event || category || material || theme)
  const heading = event ? `${eventTypeLabel(event)} decorations` : 'Decorations'

  return (
    <section className="section">
      <div className="container">
        <header className="page-head sp-head">
          <p className="eyebrow">Zenfest Decorations</p>
          <h1 className="display-l">{heading}</h1>
          <p className="lede">
            Stages, entrances, mandaps, backdrops and more — real setups for Tamil Nadu weddings and family functions.
            Log in as a client to see prices.
          </p>
        </header>

        <VenueNotice />

        <nav className="sp-chips" aria-label="Event">
          <Link className={`sp-chip ${!event ? 'is-active' : ''}`} href={href({ event: '', page: 1 })}>
            All events{counts.total ? ` (${counts.total})` : ''}
          </Link>
          {DECOR_EVENT_GROUPS.flatMap((g) => g.values)
            .filter((v) => counts.byEvent[v] > 0)
            .map((v) => (
              <Link key={v} className={`sp-chip ${event === v ? 'is-active' : ''}`} href={href({ event: v, page: 1 })}>
                {eventTypeLabel(v)} ({counts.byEvent[v]})
              </Link>
            ))}
        </nav>

        <div className="sp-filters">
          <nav className="sp-chips sp-chips--small" aria-label="Flowers and material">
            <Link className={`sp-chip ${!material ? 'is-active' : ''}`} href={href({ material: '', page: 1 })}>
              Any flowers
            </Link>
            {DECOR_MATERIALS.filter(([v]) => counts.byMaterial[v] > 0 || material === v).map(([v, label]) => (
              <Link
                key={v}
                className={`sp-chip ${material === v ? 'is-active' : ''}`}
                href={href({ material: v, page: 1 })}
              >
                {label}
              </Link>
            ))}
          </nav>
          <nav className="sp-chips sp-chips--small" aria-label="Category">
            <Link className={`sp-chip ${!category ? 'is-active' : ''}`} href={href({ category: '', page: 1 })}>
              Everything
            </Link>
            {DECOR_CATEGORIES.filter(([v]) => counts.byCategory[v] > 0).map(([v, label]) => (
              <Link
                key={v}
                className={`sp-chip ${category === v ? 'is-active' : ''}`}
                href={href({ category: v, page: 1 })}
              >
                {label}
              </Link>
            ))}
          </nav>
          <nav className="sp-chips sp-chips--small" aria-label="Style">
            <Link className={`sp-chip ${!theme ? 'is-active' : ''}`} href={href({ theme: '', page: 1 })}>
              Any style
            </Link>
            {DECOR_THEMES.map(([v, label]) => (
              <Link key={v} className={`sp-chip ${theme === v ? 'is-active' : ''}`} href={href({ theme: v, page: 1 })}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {items.length ? (
          <>
            <p className="muted dc-count">
              {total} decoration{total === 1 ? '' : 's'}
              {category ? ` · ${categoryLabel(category)}` : ''}
              {material ? ` · ${materialLabel(material)}` : ''}
            </p>
            <div className="sp-grid">
              {items.map((d) => (
                <DecorCard key={d.id} item={d} />
              ))}
            </div>
            {pages > 1 && (
              <nav className="dc-pager" aria-label="Pages">
                {page > 1 && (
                  <Link className="btn btn--ghost" href={href({ page: page - 1 })} rel="prev">
                    ← Previous
                  </Link>
                )}
                <span className="muted">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link className="btn btn--ghost" href={href({ page: page + 1 })} rel="next">
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="sp-empty card">
            <h2 className="display-m">{filtered ? 'Nothing matches yet' : 'Decorations are being added'}</h2>
            <p className="muted">
              {filtered
                ? 'Try another event, category or style — or tell us what you have in mind and our team will suggest a setup.'
                : 'Our team is adding photos of our decoration setups. Tell us about your event and we will suggest a setup.'}
            </p>
            <div className="btn-row">
              {filtered && (
                <Link className="btn btn--ghost" href="/decorations">
                  See all decorations
                </Link>
              )}
              <Link className="btn btn--primary" href="/enquire">
                Plan your event
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
