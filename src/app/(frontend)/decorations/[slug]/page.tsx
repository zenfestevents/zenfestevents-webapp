import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DecorCard } from '../../../../components/decor/DecorCard'
import { PlanSetup, VenueNotice } from '../../../../components/decor/PlanSetup'
import { ProductGallery } from '../../../../components/shop/ProductGallery'
import {
  getPublicDecoration,
  priceFor,
  relatedDecorations,
  stagePriceFor,
  type PublicPrice,
} from '../../../../lib/decorations'
import { getSiteSettings } from '../../../../lib/getSettings'
import { getCustomer } from '../../../../lib/session'
import { whatsappLink } from '../../../../lib/site'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublicDecoration((await params).slug)
  if (!found) return {}
  const { item } = found
  return {
    title: `${item.title} (${item.code}) — Decorations`,
    description:
      item.description.slice(0, 160) || `Backdrop decoration for ${item.eventLabel} by Zenfest Events.`,
    alternates: { canonical: `/decorations/${item.slug}` },
    openGraph: item.photos[0] ? { images: [item.photos[0].url] } : undefined,
  }
}

function PriceBox({ price, slug, wa }: { price: PublicPrice; slug: string; wa: string }) {
  const next = encodeURIComponent(`/decorations/${slug}`)
  if (price.state === 'shown') {
    return (
      <div className="dc-price card">
        <p className="dc-price__label">Price</p>
        <p className="dc-price__value">{price.text}</p>
        <p className="muted dc-price__note">{price.note}</p>
      </div>
    )
  }
  if (price.state === 'login') {
    return (
      <div className="dc-price card">
        <p className="dc-price__label">Price</p>
        <p className="dc-price__value dc-price__value--small">Log in to see the price</p>
        <p className="muted dc-price__note">Free for couples and families. It takes a minute with your WhatsApp number.</p>
        <div className="btn-row">
          <Link className="btn btn--primary" href={`/account/login?next=${next}`}>
            Log in
          </Link>
          <Link className="btn btn--ghost" href={`/account/signup?next=${next}`}>
            Create free account
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="dc-price card">
      <p className="dc-price__label">Price</p>
      <p className="dc-price__value dc-price__value--small">
        {price.state === 'limit'
          ? 'Message us for this price'
          : price.reason === 'expired'
            ? 'Ask us for the current price'
            : 'Contact us for the price'}
      </p>
      <p className="muted dc-price__note">
        {price.state === 'limit'
          ? 'To keep our supplier prices fair, we show only so many prices per day. WhatsApp us and we will reply with this one.'
          : 'Prices for this setup depend on your venue and date, so we quote it for you.'}
      </p>
      <div className="btn-row">
        <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
          WhatsApp us
        </a>
      </div>
    </div>
  )
}

export default async function DecorationPage({ params }: Props) {
  const { slug } = await params
  const found = await getPublicDecoration(slug)
  if (!found) notFound()
  const { item } = found

  const [customer, settings, related] = await Promise.all([
    getCustomer(),
    getSiteSettings(),
    relatedDecorations(item),
  ])
  const price = await priceFor(item.id, found.price, customer)
  // The "Plan this setup" box needs a login; the stage cost goes only to a logged-in client.
  const stage = await stagePriceFor(customer)
  const wa = whatsappLink(
    settings.contact?.whatsapp,
    `Hi Zenfest, I like decoration ${item.code} (${item.title}). Please share the details and availability.`,
  )

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow sp-crumbs">
          <Link href="/decorations">Decorations</Link>
          {' / '}
          <Link href={`/decorations?event=${item.eventType}`}>{item.eventLabel}</Link>
        </p>

        <div className="sp-product">
          <ProductGallery images={item.photos} title={item.title} />

          <div className="sp-product__info">
            <p className="sp-card__type">
              {item.materialLabel || 'Backdrop'}
              {item.kind === 'package' ? ' · Package' : ''}
            </p>
            <h1 className="display-m">{item.title}</h1>
            <p className="dc-card__code">Code {item.code}</p>

            <PriceBox price={price} slug={item.slug} wa={wa} />
            <PlanSetup
              loggedIn={stage.state === 'shown'}
              name={customer?.name?.split(' ')[0] ?? ''}
              code={item.code}
              title={item.title}
              stageText={stage.state === 'shown' ? stage.text : ''}
              whatsapp={settings.contact?.whatsapp}
              next={`/decorations/${item.slug}`}
            />

            <div className="sp-product__actions">
              <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                Ask about this on WhatsApp
              </a>
              <Link className="btn btn--ghost" href="/enquire">
                Plan your event
              </Link>
            </div>

            <dl className="sp-soldby card">
              <div>
                <dt>Good for</dt>
                <dd>
                  {[[item.eventType, item.eventLabel], ...item.alsoSuits].map(([value, label], i) => (
                    <React.Fragment key={value}>
                      {i > 0 ? ', ' : ''}
                      <Link href={`/decorations?event=${value}`}>{label}</Link>
                    </React.Fragment>
                  ))}
                </dd>
              </div>
              {item.materialLabel && (
                <div>
                  <dt>Made with</dt>
                  <dd>
                    <Link href={`/decorations?material=${item.material}`}>{item.materialLabel}</Link>
                  </dd>
                </div>
              )}
              {item.themes.length > 0 && (
                <div>
                  <dt>Style</dt>
                  <dd>{item.themes.join(', ')}</dd>
                </div>
              )}
              {item.size && (
                <div>
                  <dt>Size</dt>
                  <dd>{item.size}</dd>
                </div>
              )}
              {item.includes && (
                <div>
                  <dt>Includes</dt>
                  <dd className="dc-includes">{item.includes}</dd>
                </div>
              )}
            </dl>

            {item.description && <div className="sp-product__desc">{item.description}</div>}

            <VenueNotice />
          </div>
        </div>

        {related.length > 0 && (
          <>
            <div className="mk-section-head">
              <h2 className="display-m">More for {item.eventLabel}</h2>
              <Link href={`/decorations?event=${item.eventType}`} className="link-arrow">
                See all →
              </Link>
            </div>
            <div className="sp-grid">
              {related.map((d) => (
                <DecorCard key={d.id} item={d} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
