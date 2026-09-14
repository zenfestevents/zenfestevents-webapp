import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { getPayloadClient } from '../../../lib/payload'
import { mediaUrl } from '../../../lib/media'
import { Reveal } from '../../../components/Reveal'
import { KolamDivider } from '../../../components/Kolam'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Decoration, catering, photography, DJ and complete event coordination from Zenfest Events, Chennai.',
}

const FALLBACK = [
  { title: 'Decoration', description: 'Themes, florals, stage and mandap styling, lighting and draping tailored to your event.' },
  { title: 'Catering', description: 'Multi-cuisine menus for any guest count, with tasting and full service.' },
  { title: 'Photography', description: 'Candid and traditional photography and videography to keep every moment.' },
  { title: 'DJ & Sound', description: 'Music, sound, lighting and live entertainment to set the mood.' },
  { title: 'Complete coordination', description: 'One team managing vendors, timeline and the day itself end to end.' },
]

export default async function ServicesPage() {
  let services: any[] = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'services', depth: 1, limit: 50, sort: 'order' })
    services = res.docs
  } catch {
    services = []
  }
  const list = services.length ? services : FALLBACK

  return (
    <>
      <section className="section">
        <div className="container">
          <header className="page-head">
            <p className="eyebrow">Services</p>
            <h1 className="display-l">
              One team for <span className="italic accent">every</span> part of the day
            </h1>
            <p className="lede">
              Pick a single service or hand us the whole event. Either way, you deal with
              one coordinated team — no chasing separate vendors.
            </p>
          </header>

          <div className="svc-list">
            {list.map((s: any, i: number) => (
              <Reveal key={s.id || i} className="svc-row" delay={i * 60}>
                {s.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="svc-row__img" src={mediaUrl(s.image, 'card')} alt={s.title} loading="lazy" />
                )}
                <div className="svc-row__body">
                  <span className="svc-row__num">{String(i + 1).padStart(2, '0')}</span>
                  <h2 className="display-m">{s.title}</h2>
                  <p className="muted">{s.description || s.summary}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <KolamDivider />

      <section className="section--tight">
        <div className="container text-center stack">
          <h2 className="display-m">Not sure what you need?</h2>
          <p className="lede mx-auto">Tell us about your event and we&apos;ll suggest the right mix.</p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--primary" href="/contact">
              Get a callback
            </Link>
            <Link className="btn btn--ghost" href="/packages">
              Browse packages
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
