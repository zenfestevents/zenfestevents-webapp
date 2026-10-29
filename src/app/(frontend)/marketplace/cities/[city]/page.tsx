import React, { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AreaCrumbs } from '../../../../../components/areas/AreaCrumbs'
import { ZenfestHostCard } from '../../../../../components/areas/ZenfestHostCard'
import { VendorCard } from '../../../../../components/market/VendorCard'
import { AREA_SERVICES, CITIES_HREF, areaPageHref, cityHref, servicesFor } from '../../../../../lib/areaPages'
import { indexable, showVendors, vendorsInCity } from '../../../../../lib/areaVendors'
import { VENDORS_HREF } from '../../../../../lib/features'
import { getSiteSettings } from '../../../../../lib/getSettings'
import { findPlace } from '../../../../../lib/locations'

// A cached page (CLAUDE.md, "Page caching"), built the first time each city is visited.
export const revalidate = 300
export const generateStaticParams = async () => []

type Params = Promise<{ city: string }>

/** The city page's area grid links each area to these services (the "side doors"). */
const POPULAR = ['event-planners', 'birthday-decorators', 'wedding-decorators', 'photographers', 'caterers']

const load = cache(async (slug: string) => {
  const place = findPlace(slug)
  if (place?.kind !== 'city') return null
  return { place, vendors: await vendorsInCity(place.city) }
})

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city: slug } = await params
  const page = await load(slug)
  if (!page) return {}
  const { city } = page.place
  return {
    title: `Event services in ${city.name}`,
    description:
      city.zone === 'direct'
        ? `Weddings, birthdays, baby showers and functions in ${city.name}, planned and run by Zenfest Events' own team — décor, catering, photography and more, area by area.`
        : `Wedding and event vendors in ${city.name} with prices upfront — decorators, photographers, caterers and more, checked by Zenfest Events.`,
    alternates: { canonical: cityHref(city) },
    ...(indexable(null, page.place, page.vendors.length) ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function CityPage({ params }: { params: Params }) {
  const { city: slug } = await params
  const page = await load(slug)
  if (!page) notFound()
  const { place, vendors } = page
  const city = place.city
  const direct = city.zone === 'direct'
  const services = servicesFor(city)
  const popular = services.filter((s) => POPULAR.includes(s.slug))
  const settings = direct ? await getSiteSettings() : null

  return (
    <section className="section section--tight ar-page">
      <div className="container">
        <AreaCrumbs
          items={[
            { name: 'Home', href: '/' },
            { name: 'Marketplace', href: CITIES_HREF },
            { name: city.name, href: cityHref(city) },
          ]}
        />
        <header className="page-head">
          <p className="eyebrow">{direct ? 'Zenfest’s own team' : 'Local partner vendors'}</p>
          <h1 className="display-l">
            Event services in <span className="accent">{city.name}</span>
          </h1>
          <p className="lede">
            {direct
              ? `Zenfest Events plans and runs weddings, birthdays, baby showers and functions across ${city.name} with its own team. Pick a service and your area below.`
              : `Decorators, photographers, caterers and more who serve ${city.name}, with prices upfront. Pick a service and your area below.`}
          </p>
        </header>

        {direct && settings && (
          <div className="mk-grid ar-results">
            <ZenfestHostCard service={AREA_SERVICES[0]} place={place} settings={settings} />
          </div>
        )}

        <h2 className="display-s ar-head">Services in {city.name}</h2>
        <ul className="mk-cats">
          {services.map((s) => (
            <li key={s.slug}>
              <Link className="mk-cat" href={areaPageHref(s, city.slug)}>
                <strong>{s.label}</strong>
                <span className="muted">
                  {direct || !s.market ? `Zenfest Events ${s.zenfest}.` : `Local ${s.label.toLowerCase()} in ${city.name}.`}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="display-s ar-head">Popular areas in {city.name}</h2>
        <ul className="ar-areas">
          {city.areas.map((a) => (
            <li key={a.slug} className="ar-area">
              <h3 className="ar-area__name">{a.name}</h3>
              <ul className="ar-area__links">
                {popular.map((s) => (
                  <li key={s.slug}>
                    <Link href={areaPageHref(s, a.slug)}>
                      {s.short} in {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {showVendors && vendors.length > 0 && (
          <>
            <h2 className="display-s ar-head">Vendors who serve {city.name}</h2>
            <div className="mk-grid">
              {vendors.map((v) => (
                <VendorCard key={v.id} vendor={v} km={v.km} />
              ))}
            </div>
          </>
        )}

        {!direct && !vendors.length && (
          <div className="mk-empty card ar-empty">
            <h2 className="display-s">We&apos;re signing up vendors in {city.name}</h2>
            <p className="muted">
              Planning an event here? Tell us what you need and we&apos;ll put you in touch with a checked local partner.
            </p>
            <div className="btn-row">
              <Link className="btn btn--gold" href="/enquire">
                Tell us what you need
              </Link>
              <Link className="btn btn--ghost" href={VENDORS_HREF}>
                Vendor in {city.name}? Join us
              </Link>
            </div>
          </div>
        )}

        <p className="ar-join muted">
          <Link href={CITIES_HREF} className="accent">
            All 25 cities we cover
          </Link>
        </p>
      </div>
    </section>
  )
}
