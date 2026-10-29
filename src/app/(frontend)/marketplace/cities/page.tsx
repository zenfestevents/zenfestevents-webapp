import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AreaCrumbs } from '../../../../components/areas/AreaCrumbs'
import { CITIES_HREF, cityHref } from '../../../../lib/areaPages'
import { CITIES } from '../../../../lib/locations'

// A cached page (CLAUDE.md, "Page caching"): nothing here changes between visits.
export const revalidate = 300

export const metadata: Metadata = {
  alternates: { canonical: CITIES_HREF },
  title: 'Marketplace — vendors by city',
  description:
    'Zenfest Events across Tamil Nadu: our own team in Chennai, Tambaram, Avadi and Kanchipuram, and checked local partner vendors in 21 more cities.',
}

const byName = (zone: 'direct' | 'market') =>
  CITIES.filter((c) => c.zone === zone).sort((a, b) => a.name.localeCompare(b.name))

/** The front door: Tamil Nadu's 25 city corporations, each with its own page. */
export default function CitiesPage() {
  return (
    <section className="section section--tight ar-page">
      <div className="container">
        <AreaCrumbs
          items={[
            { name: 'Home', href: '/' },
            { name: 'Marketplace', href: CITIES_HREF },
          ]}
        />
        <header className="page-head">
          <p className="eyebrow">Marketplace · across Tamil Nadu</p>
          <h1 className="display-l">
            Find vendors in <span className="accent">your city</span>
          </h1>
          <p className="lede">
            Zenfest&apos;s own team plans and runs events in four cities; in the rest we work with checked local partner
            vendors. Pick your city for services and areas.
          </p>
        </header>

        <h2 className="display-s ar-head">Planned by Zenfest&apos;s own team</h2>
        <ul className="ar-cities">
          {byName('direct').map((c) => (
            <li key={c.slug}>
              <Link href={cityHref(c)}>{c.name}</Link>
            </li>
          ))}
        </ul>

        <h2 className="display-s ar-head">Local partner vendors</h2>
        <ul className="ar-cities">
          {byName('market').map((c) => (
            <li key={c.slug}>
              <Link href={cityHref(c)}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
