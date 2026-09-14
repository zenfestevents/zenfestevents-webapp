import Link from 'next/link'
import React from 'react'

import { getPayloadClient } from '../../lib/payload'
import { whatsappLink, DEFAULT_WA_MESSAGE, SITE_FALLBACK } from '../../lib/site'
import { getSiteSettings } from '../../lib/getSettings'
import { mediaUrl } from '../../lib/media'
import { KolamRosette, KolamDivider } from '../../components/Kolam'
import { Reveal } from '../../components/Reveal'
import { ScrubHero } from '../../components/ScrubHero'

export const dynamic = 'force-dynamic'

async function getHomeData() {
  try {
    const payload = await getPayloadClient()
    const [projects, services] = await Promise.all([
      payload.find({ collection: 'projects', where: { featured: { equals: true } }, depth: 1, limit: 6, sort: '-createdAt' }),
      payload.find({ collection: 'services', depth: 1, limit: 6, sort: 'order' }),
    ])
    let featured = projects.docs
    if (featured.length === 0) {
      const any = await payload.find({ collection: 'projects', depth: 1, limit: 6, sort: '-createdAt' })
      featured = any.docs
    }
    return { featured, services: services.docs }
  } catch {
    return { featured: [], services: [] }
  }
}

export default async function HomePage() {
  const [data, settings] = await Promise.all([getHomeData(), getSiteSettings()])
  const hero = { ...SITE_FALLBACK.hero, ...(settings?.hero || {}) }
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)

  return (
    <>
      {/* ---------- HERO: full-bleed scroll-scrubbed reception film ---------- */}
      <ScrubHero
        headline={hero.headline}
        subheadline={hero.subheadline}
        waHref={wa}
        hasWhatsapp={Boolean(settings?.contact?.whatsapp)}
      />

      {/* ---------- FEATURED WORK ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Our Work</p>
              <h2 className="display-l">
                Photos do the <span className="italic accent">talking</span>
              </h2>
            </div>
            <Link href="/gallery" className="section-head__link">
              View full gallery →
            </Link>
          </div>

          {data.featured.length > 0 ? (
            <div className="feature-grid">
              {data.featured.slice(0, 6).map((p: any, i: number) => (
                <Reveal key={p.id} className={`feature-card ${i === 0 ? 'feature-card--lead' : ''}`} delay={i * 60}>
                  <Link href={`/gallery`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p.coverImage, 'card')} alt={p.title} loading="lazy" />
                    <span className="feature-card__meta">
                      <span className="feature-card__cat">{p.category?.title}</span>
                      <span className="feature-card__title">{p.title}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="muted">Our gallery is being prepared — beautiful events coming soon.</p>
          )}
        </div>
      </section>

      <KolamDivider />

      {/* ---------- SERVICES ---------- */}
      <section className="section band-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">What we do</p>
              <h2 className="display-l">Everything, under one roof</h2>
            </div>
            <Link href="/services" className="section-head__link">
              All services →
            </Link>
          </div>

          <div className="svc-grid">
            {(data.services.length ? data.services : FALLBACK_SERVICES).map((s: any, i: number) => (
              <Reveal key={s.id || i} className="svc-card" delay={i * 50}>
                <h3 className="svc-card__title">{s.title}</h3>
                <p className="muted">{s.summary || s.description || ''}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Packages section removed until the real packages are finalised — see the
          PACKAGES_READY flag in app/(frontend)/packages/page.tsx. */}

      {/* ---------- CLOSING CTA ---------- */}
      <section className="section cta-band band-ink">
        <KolamRosette size={340} className="cta-band__kolam" />
        <div className="container cta-band__inner">
          <p className="eyebrow">Let&apos;s plan yours</p>
          <h2 className="display-l">
            Tell us about your <span className="italic accent">event</span>
          </h2>
          <p className="lede mx-auto text-center">
            Share a few details and we&apos;ll call you back with ideas and a quote. Most
            clients reach us fastest on WhatsApp.
          </p>
          <div className="btn-row cta-band__cta">
            <Link className="btn btn--primary" href="/contact">
              Request a callback
            </Link>
            {settings?.contact?.whatsapp && (
              <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                Message on WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

const FALLBACK_SERVICES = [
  { title: 'Decoration', summary: 'Themes, florals, stage & mandap styling.' },
  { title: 'Catering', summary: 'Multi-cuisine menus for every scale.' },
  { title: 'Photography', summary: 'Candid & traditional photo and video.' },
  { title: 'DJ & Sound', summary: 'Music, lighting and live entertainment.' },
  { title: 'Complete coordination', summary: 'One team managing the whole day.' },
  { title: 'Custom packages', summary: 'Mix services to fit your budget.' },
]
