import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MonthCalendarStatic } from '../../../../../components/market/MonthCalendarStatic'
import { QuoteForm } from '../../../../../components/market/QuoteForm'
import { ShortlistButton } from '../../../../../components/market/ShortlistButton'
import { dayKey, getPublicVendor } from '../../../../../lib/marketplace'
import { ALL_CHENNAI, rupees, unitLabel } from '../../../../../lib/marketplaceOptions'
import { getCustomer } from '../../../../../lib/session'

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const vendor = await getPublicVendor((await params).slug)
  if (!vendor) return { title: 'Vendor not found' }
  const from = vendor.startingPrice ? ` From ${rupees(vendor.startingPrice)}.` : ''
  return {
    title: `${vendor.businessName} — ${vendor.service} in Chennai`,
    description: `${vendor.about.slice(0, 140)}${from}`,
    openGraph: vendor.cover ? { images: [{ url: vendor.cover.url }] } : undefined,
  }
}

export default async function VendorPage({ params }: { params: Params }) {
  const { slug } = await params
  const [vendor, customer] = await Promise.all([getPublicVendor(slug), getCustomer()])
  if (!vendor) notFound()
  const saved = (customer?.shortlist ?? []).some((s) => (typeof s === 'object' ? s.id : s) === vendor.id)
  const [hero, ...rest] = vendor.gallery.length ? vendor.gallery : vendor.cover ? [vendor.cover] : []
  const areas = vendor.areas.includes(ALL_CHENNAI) ? [ALL_CHENNAI] : vendor.areas
  const languages = vendor.languages.map((l) => l[0].toUpperCase() + l.slice(1))

  return (
    <article className="section section--tight vp">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/marketplace">Marketplace</Link> <span aria-hidden="true">/</span>{' '}
          <Link href={`/marketplace/${vendor.category}`}>{vendor.categoryLabel}</Link>{' '}
          <span aria-hidden="true">/</span> <span>{vendor.businessName}</span>
        </nav>

        <header className="vp__head">
          <div>
            <p className="eyebrow">{vendor.service}</p>
            <h1 className="display-l">{vendor.businessName}</h1>
            <p className="vp__badges">
              <span className="mk-card__badge">✓ Reviewed by Zenfest</span>
              {vendor.phoneVerified && <span className="mk-card__badge">✓ Phone verified</span>}
              {vendor.startingPrice != null && <span className="vp__from">From {rupees(vendor.startingPrice)}</span>}
            </p>
          </div>
          <div className="vp__head-actions">
            <ShortlistButton slug={vendor.slug} initial={saved} variant="button" />
            <a className="btn btn--primary" href="#quote">
              Request a quote
            </a>
          </div>
        </header>

        {hero && (
          <div className={`vp__gallery ${rest.length ? '' : 'vp__gallery--single'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="vp__hero-img" src={hero.url} alt={hero.alt || vendor.businessName} fetchPriority="high" />
            {rest.slice(0, 8).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.card} alt={p.alt || vendor.businessName} loading="lazy" width={800} height={600} />
            ))}
          </div>
        )}

        <div className="vp__layout">
          <div className="vp__main">
            <section>
              <h2 className="display-s">About</h2>
              {vendor.about.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="vp__about">
                  {para}
                </p>
              ))}
              <dl className="vp__facts">
                <div>
                  <dt>Serves</dt>
                  <dd>{areas.join(', ')}</dd>
                </div>
                {languages.length > 0 && (
                  <div>
                    <dt>Speaks</dt>
                    <dd>{languages.join(', ')}</dd>
                  </div>
                )}
                {vendor.instagram && (
                  <div>
                    <dt>Work</dt>
                    <dd>
                      <a href={vendor.instagram} target="_blank" rel="noopener nofollow">
                        {vendor.instagram.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section>
              <h2 className="display-s">Prices</h2>
              <table className="price-card">
                <tbody>
                  {vendor.priceCard.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {r.item}
                        {r.note && <span className="muted">{r.note}</span>}
                      </th>
                      <td>
                        <strong>{rupees(r.price)}</strong> <span className="muted">{unitLabel(r.unit)}</span>
                        <span className="price-card__gst">{r.gstIncluded ? 'GST incl.' : '+ GST'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="field__hint">
                Prices are set by the vendor. Confirm what&apos;s included in your quote before you pay an advance.
              </p>
            </section>

            <section>
              <h2 className="display-s">Availability</h2>
              <MonthCalendarStatic blocked={vendor.blockedDates} />
            </section>
          </div>

          <aside className="vp__side" id="quote">
            <div className="card vp__quote">
              <h2 className="display-s">Request a quote</h2>
              <QuoteForm
                slug={vendor.slug}
                vendorName={vendor.businessName}
                loggedIn={Boolean(customer)}
                blockedDates={vendor.blockedDates}
                defaults={{
                  eventDate: customer?.eventDate ? dayKey(customer.eventDate) : '',
                  area: customer?.city ?? '',
                }}
              />
            </div>
            <div className="vp__planner">
              <p>
                <strong>Want it all handled?</strong> Zenfest planners can book {vendor.businessName} and the rest of
                your vendors for you.
              </p>
              <Link href="/contact" className="link-arrow">
                Talk to a planner →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}
