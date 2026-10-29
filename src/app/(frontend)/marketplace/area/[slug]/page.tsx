import React, { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AreaCrumbs } from '../../../../../components/areas/AreaCrumbs'
import { ZenfestHostCard } from '../../../../../components/areas/ZenfestHostCard'
import { VendorCard } from '../../../../../components/market/VendorCard'
import { CITIES_HREF, areaPageHref, cityHref, parseAreaSlug, servicesFor } from '../../../../../lib/areaPages'
import { indexable, showVendors, vendorsFor } from '../../../../../lib/areaVendors'
import { VENDORS_HREF } from '../../../../../lib/features'
import { getSiteSettings } from '../../../../../lib/getSettings'
import { distanceKm, nearestPlaces, placeName, placeTitle, placesOf } from '../../../../../lib/locations'
import { SITE_URL, jsonLdText } from '../../../../../lib/seo'

// A cached page (CLAUDE.md, "Page caching"), built the first time each address is visited:
// /marketplace/<service>-in-<city or area>, rewritten here by next.config.ts. Anything else is a 404.
export const revalidate = 300
export const generateStaticParams = async () => []

type Params = Promise<{ slug: string }>

/** Shared by the metadata and the page, so the vendors are read once per render. */
const load = cache(async (slug: string) => {
  const hit = parseAreaSlug(slug)
  if (!hit) return null
  return { ...hit, vendors: await vendorsFor(hit.service, hit.place) }
})

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const page = await load(slug)
  if (!page) return {}
  const { service, place, vendors } = page
  const where = placeTitle(place)
  return {
    title: `${service.label} in ${where}`,
    description:
      place.city.zone === 'direct'
        ? `${service.label} in ${where}: Zenfest Events ${service.zenfest}. Free quote on WhatsApp.`
        : `${service.label} in ${where} with prices upfront: local vendors who travel to ${placeName(place)}, checked by Zenfest Events.`,
    alternates: { canonical: areaPageHref(service, place.slug) },
    // Built for every place, on Google only once it has something real on it.
    ...(indexable(service, place, vendors.length) ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function AreaServicePage({ params }: { params: Params }) {
  const { slug } = await params
  const page = await load(slug)
  if (!page) notFound()
  const { service, place, vendors } = page
  const settings = await getSiteSettings()
  const city = place.city
  const direct = city.zone === 'direct'
  const name = placeName(place)
  const where = placeTitle(place)
  const lower = service.label.toLowerCase()

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Marketplace', href: CITIES_HREF },
    { name: city.name, href: cityHref(city) },
    { name: service.label, href: areaPageHref(service, city.slug) },
    ...(place.kind === 'area' ? [{ name: place.area.name, href: areaPageHref(service, place.slug) }] : []),
  ]
  // The same service nearby (any city, nearest first), or the city's own areas on a city page.
  const nearby =
    place.kind === 'area'
      ? nearestPlaces(place, 8).filter((p) => servicesFor(p.city).includes(service))
      : placesOf(city).slice(1)
  const others = servicesFor(city).filter((s) => s !== service)

  return (
    <section className="section section--tight ar-page">
      <div className="container">
        <AreaCrumbs items={crumbs} />
        {direct && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLdText({
                '@context': 'https://schema.org',
                '@type': 'Service',
                name: `${service.label} in ${where}`,
                serviceType: service.label,
                provider: { '@id': `${SITE_URL}/#business` },
                areaServed: { '@type': 'Place', name: `${where}, Tamil Nadu` },
              }),
            }}
          />
        )}
        <header className="page-head">
          <p className="eyebrow">
            {direct ? 'Zenfest’s own team' : 'Local vendors'} · {city.name}
          </p>
          <h1 className="display-l">
            {service.label} in <span className="accent">{where}</span>
          </h1>
          <p className="lede">
            {direct
              ? `Zenfest’s own team works in ${name}${place.kind === 'area' ? ` and the rest of ${city.name}` : ''}: tell us your date and we’ll plan, quote and run it.`
              : `${service.label} who serve ${name}, with prices upfront. The Zenfest team checks every listing before it goes live.`}
            {direct && showVendors && service.market ? ` Local ${lower} who travel to ${name} are listed below.` : ''}
          </p>
        </header>

        {(direct || vendors.length > 0) && (
          <div className="mk-grid ar-results">
            {direct && <ZenfestHostCard service={service} place={place} settings={settings} />}
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} km={v.km} />
            ))}
          </div>
        )}

        {!direct && !vendors.length && (
          <div className="mk-empty card">
            <h2 className="display-s">
              We&apos;re signing up {lower} in {city.name}
            </h2>
            <p className="muted">
              Tell us your date and what you need, and we&apos;ll put you in touch with a checked local partner who
              covers {name}.
            </p>
            <div className="btn-row">
              <Link className="btn btn--gold" href={service.event ? `/enquire?event=${service.event}` : '/enquire'}>
                Tell us what you need
              </Link>
            </div>
          </div>
        )}

        {service.market && (
          <p className="ar-join muted">
            Are you one of the {lower} in {name}?{' '}
            <Link href={VENDORS_HREF} className="accent">
              Join Zenfest&apos;s vendor network
            </Link>
          </p>
        )}

        {nearby.length > 0 && (
          <>
            <h2 className="display-s ar-head">
              {place.kind === 'area' ? `${service.label} near ${name}` : `${service.label} by area in ${city.name}`}
            </h2>
            <ul className="ar-links">
              {nearby.map((p) => (
                <li key={p.slug}>
                  <Link href={areaPageHref(service, p.slug)}>
                    {placeName(p)}
                    <span className="muted">
                      {place.kind === 'area'
                        ? `${p.city.slug === city.slug ? '' : `${p.city.name} · `}${Math.max(1, Math.round(distanceKm(place, p)))} km`
                        : city.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="display-s ar-head">More for your event in {name}</h2>
        <ul className="ar-chips">
          {others.map((s) => (
            <li key={s.slug}>
              <Link className="chip" href={areaPageHref(s, place.slug)}>
                {s.label}
              </Link>
            </li>
          ))}
          <li>
            <Link className="chip" href={cityHref(city)}>
              Everything in {city.name}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
