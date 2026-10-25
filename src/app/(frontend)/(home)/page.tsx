import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { getPayloadClient } from '../../../lib/payload'
import { CONTENT_TAGS, cachedContent } from '../../../lib/contentCache'
import { whatsappLink, DEFAULT_WA_MESSAGE, MAJOR_CITIES, SITE_FALLBACK } from '../../../lib/site'
import { getSiteSettings } from '../../../lib/getSettings'
import { mediaUrl } from '../../../lib/media'
import { SERVICES } from '../../../lib/serviceCatalog'
import { KolamRosette } from '../../../components/Kolam'
import { BallDots, LaurelRating, Scoreboard, SeamDivider, type ScoreItem } from '../../../components/game'
import { Reveal } from '../../../components/Reveal'
import { ScrubHero } from '../../../components/ScrubHero'
import { VendorPaths } from '../../../components/VendorPaths'
import { TestimonialCard } from '../../../components/TestimonialCard'
import { homeTestimonials } from '../../../lib/testimonials'
import { VoteCard } from '../../../components/polls/VoteCard'
import { getFeaturedPoll, getPollView } from '../../../lib/polls'
import { pollVerifyMode } from '../../../lib/voterVerification'
import { MeetZenfestAI } from '../../../components/ai/MeetZenfestAI'
import { getAgentProfiles } from '../../../lib/ai/knowledge'
import { aiAvailable } from '../../../lib/ai/status'
import { VendorCard } from '../../../components/market/VendorCard'
import { listVendors, type PublicVendor } from '../../../lib/marketplace'
import { MARKET_CATEGORIES } from '../../../lib/marketplaceOptions'
import { ANNOUNCE_COMING_SOON, COMING_SOON, FEATURES } from '../../../lib/features'
import { businessJsonLd, jsonLdText } from '../../../lib/seo'

// A cached page (CLAUDE.md, "Page caching"): rebuilt at most every 5 minutes, at once when /admin saves.
export const revalidate = 300

// Title and description come from the root layout.
export const metadata: Metadata = { alternates: { canonical: '/' } }

/** The featured live poll and this visitor's view of it; null when there's none (or the DB is down). */
async function getHomePoll() {
  try {
    const poll = await getFeaturedPoll()
    return poll ? { poll, view: await getPollView(poll) } : null
  } catch {
    return null
  }
}

// Cached (lib/contentCache.ts): saving a project or service in /admin clears it. The
// "any recent project" fallback runs alongside, not after, the featured query.
const readHomeData = cachedContent(
  async () => {
    const payload = await getPayloadClient()
    const [featured, recent, services] = await Promise.all([
      payload.find({ collection: 'projects', where: { featured: { equals: true } }, depth: 1, limit: 6, sort: '-createdAt' }),
      payload.find({ collection: 'projects', depth: 1, limit: 6, sort: '-createdAt' }),
      payload.find({ collection: 'services', depth: 1, limit: 6, sort: 'order' }),
    ])
    return { featured: featured.docs.length ? featured.docs : recent.docs, services: services.docs }
  },
  'home-data',
  [CONTENT_TAGS.projects, CONTENT_TAGS.services],
)

async function getHomeData() {
  try {
    return await readHomeData()
  } catch {
    return { featured: [], services: [] }
  }
}

/**
 * Newest live marketplace listings (empty if the DB is down). The page is cached, so it
 * never reads the login: each card's heart fills in from the browser's session.
 */
async function getHomeMarket(): Promise<PublicVendor[]> {
  try {
    return (await listVendors({ sort: 'new' })).slice(0, 4)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [data, settings, homePoll, agents, market, reviews] = await Promise.all([
    getHomeData(),
    getSiteSettings(),
    FEATURES.polls ? getHomePoll() : null,
    // The AI band's specialist list; skipped (one query fewer) while the AI is switched off.
    FEATURES.ai ? getAgentProfiles() : [],
    FEATURES.marketplace ? getHomeMarket() : [],
    homeTestimonials(),
  ])
  // Switched-off features (lib/features.ts) get one "Coming soon" band instead of their own,
  // and only while ANNOUNCE_COMING_SOON is on.
  const soon = ANNOUNCE_COMING_SOON ? COMING_SOON.filter((f) => !FEATURES[f.key]) : []
  const hero = { ...SITE_FALLBACK.hero, ...(settings?.hero || {}) }
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)
  const rating = { ...SITE_FALLBACK.reviews, ...(settings?.reviews || {}) }
  // The scoreboard shows real figures only: the Google numbers from Site Settings, the
  // cities we work in and the size of the service catalogue.
  const score: ScoreItem[] = [
    ...(rating.googleRating && rating.googleCount
      ? [
          { value: `${rating.googleRating.toFixed(1)}★`, label: 'Google rating' },
          { value: rating.googleCount, label: 'Google reviews' },
        ]
      : []),
    { value: MAJOR_CITIES.length, label: 'Major cities' },
    { value: SERVICES.length, label: 'Services in the squad' },
  ]

  // Clients first, vendors after (owner, 2026-10-24): our work, services, reviews and the
  // Runs club come before the vendor lanes and the marketplace. No gift registry band
  // while the Shop is off (the registry itself stays live at /registry).
  return (
    <>
      {/* The business for Google: name, phone, branches, the cities we serve (lib/seo.ts). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(businessJsonLd(settings)) }} />

      {/* ---------- HERO: full-bleed scroll-scrubbed reception film ---------- */}
      <ScrubHero
        headline={hero.headline}
        subheadline={hero.subheadline}
      />

      {/* ---------- SCOREBOARD: real numbers, big and tabular ---------- */}
      <section className="section--tight home-score">
        <div className="container">
          <p className="eyebrow">Scoreboard</p>
          <Scoreboard items={score} className="home-score__board" />
        </div>
      </section>

      {/* ---------- FEATURED WORK ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Highlights</p>
              <h2 className="display-l">
                Photos do the <span className="italic accent">talking</span>
              </h2>
            </div>
            {data.featured.length > 0 && (
              <Link href="/gallery" className="section-head__link">
                View full gallery →
              </Link>
            )}
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
            /* No projects uploaded yet. Resolves itself once the first project
               is added in /admin — nothing to switch off here. */
            <div className="coming-soon">
              <KolamRosette size={260} className="coming-soon__kolam" />
              <p className="eyebrow">Coming soon</p>
              <h3 className="display-m">Our gallery is being put together</h3>
              <p className="lede">
                We&apos;re choosing the best photographs from our recent weddings,
                birthdays and corporate events. Until they&apos;re up, message us and
                we&apos;ll send you work from events like yours right away.
              </p>
              <div className="btn-row">
                <Link className="btn btn--primary" href="/contact">
                  Request a callback
                </Link>
                {settings?.contact?.whatsapp && (
                  <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                    See recent work on WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- ZENFEST AI: the AI planner and its specialist team ---------- */}
      {aiAvailable(settings) && (
        <MeetZenfestAI headline={settings.ai?.bandHeadline || 'Plan your whole event with Zenfest AI'} agents={agents} />
      )}

      {/* ---------- SERVICES ---------- */}
      <section className="section band-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">The squad</p>
              <h2 className="display-l">Everything, under one roof</h2>
            </div>
            <Link href="/services" className="section-head__link">
              All services →
            </Link>
          </div>

          {/* Player cards: squad number, name, the gold bail. The "whole event" service is
              the gold card — the one that captains the rest. */}
          <div className="svc-grid">
            {(data.services.length ? data.services : FALLBACK_SERVICES).map((s: any, i: number) => (
              <Reveal
                key={s.id || i}
                className={`svc-card player-card corner-mark ${/coordinat|complete/i.test(s.title) ? 'card--featured' : ''}`}
                delay={i * 50}
              >
                <span className="player-card__no mono">No. {String(i + 1).padStart(2, '0')}</span>
                <h3 className="svc-card__title">{s.title}</h3>
                <p className="muted">{s.summary || s.description || ''}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS: three reviews (collections/Testimonials.ts), all on /testimonials ---------- */}
      {reviews.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">From the stands</p>
                <h2 className="display-l">
                  Loved by <span className="italic accent">families</span>
                </h2>
              </div>
              {rating.googleRating && rating.googleCount ? (
                <Link href="/testimonials" className="home-reviews__laurel" aria-label="All reviews">
                  <LaurelRating
                    score={rating.googleRating.toFixed(1)}
                    caption={`${rating.googleCount} Google reviews →`}
                  />
                </Link>
              ) : (
                <Link href="/testimonials" className="section-head__link">
                  All reviews →
                </Link>
              )}
            </div>
            <div className="testimonial-strip">
              {reviews.map((t, i) => (
                <Reveal key={t.id} delay={i * 70}>
                  <TestimonialCard t={t} clamp />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- LIVE POLL (/polls) ---------- */}
      {homePoll && (
        <section className="section--tight band-soft">
          <div className="container home-poll__inner">
            <div>
              <p className="eyebrow">Zenfest Polls</p>
              <h2 className="display-m">
                Have your <span className="italic accent">say</span>
              </h2>
              <p className="lede">
                Cricket, cinema, food and everything in between — one person, one vote. See what everyone
                thinks, then share it on WhatsApp.
              </p>
              <Link className="btn btn--ghost home-earn__btn" href="/polls">
                All live polls
              </Link>
            </div>
            <div className="home-poll__card card">
              <h3 className="poll-feature__q">
                <Link href={`/polls/${homePoll.poll.slug}`}>{homePoll.poll.question}</Link>
              </h3>
              <VoteCard
                poll={homePoll.poll}
                results={homePoll.view.results}
                myVote={homePoll.view.myVote}
                voter={homePoll.view.voter}
                verifyMode={pollVerifyMode()}
                compact
              />
            </div>
          </div>
        </section>
      )}

      {/* ---------- RUNS CLUB: points for couples and vendors (/rewards) ---------- */}
      {FEATURES.marketplace && (
        <section className="section--tight band-ink home-runs">
          <div className="container home-runs__inner">
            <div>
              <p className="eyebrow">Runs club</p>
              <h2 className="display-m">
                Score runs, save on your <span className="accent">next event</span>
              </h2>
              <p className="lede">
                Plan with us, book with us and invite friends: every one scores runs. Climb from Debut to Hall of Fame
                and your level&apos;s discount comes off your next quote. Free to join.
              </p>
              <BallDots done={3} current={3} className="home-runs__balls" />
            </div>
            <div className="btn-row">
              <Link className="btn btn--primary" href="/rewards">
                Join the Runs club
              </Link>
            </div>
          </div>
        </section>
      )}

      <SeamDivider />

      {/* ---------- FOR VENDORS: the vendor lanes (partner, + marketplace once open), also the phone hero's later slides ---------- */}
      <section className="section home-vendors">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">For vendors</p>
              <h2 className="display-l">
                {FEATURES.marketplace ? 'Two ways to grow with ' : 'Grow with '}
                <span className="accent">Zenfest</span>
              </h2>
            </div>
            {FEATURES.marketplace && (
              <Link href="/vendors" className="section-head__link">
                For vendors →
              </Link>
            )}
          </div>
          <Reveal>
            <VendorPaths heading="h3" />
          </Reveal>
        </div>
      </section>

      {/* ---------- MARKETPLACE: the DIY lane — book vendors directly ---------- */}
      {FEATURES.marketplace && (
      <section className="section band-soft home-market">
        <div className="container home-market__inner">
          <Reveal className="home-market__intro">
            <p className="eyebrow">Zenfest marketplace</p>
            <h2 className="display-l">
              Book vendors <span className="accent">directly</span>
            </h2>
            <p className="lede">
              Doing it yourself? Compare photographers, makeup artists, decorators, caterers and halls across
              Tamil Nadu — real prices upfront, dates you can trust, every listing checked by our team.
            </p>
            <ul className="home-market__cats">
              {MARKET_CATEGORIES.filter(([v]) => v !== 'other').map(([v, label]) => (
                <li key={v}>
                  <Link href={`/marketplace/${v}`}>{label}</Link>
                </li>
              ))}
            </ul>
            <div className="btn-row">
              <Link className="btn btn--primary" href="/marketplace">
                Browse the marketplace
              </Link>
              <Link className="home-market__vendor-link" href="/vendors/marketplace">
                Are you a vendor? List free →
              </Link>
            </div>
          </Reveal>
          {market.length > 0 && (
            <div className="home-market__grid">
              {market.map((v, i) => (
                <Reveal key={v.id} delay={i * 70}>
                  <VendorCard vendor={v} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ---------- EARN FROM EVENTS (hosts programme, /earn) ---------- */}
      {FEATURES.earn && (
      <section className="section band-ink home-earn">
        <KolamRosette size={300} className="home-earn__kolam" />
        <div className="container home-earn__inner">
          <div>
            <p className="eyebrow">For families</p>
            <h2 className="display-l">
              Earn from your <span className="italic accent">event</span>
            </h2>
            <p className="lede">
              Welcome a few travellers from abroad to your wedding or family function in
              Tamil Nadu, and earn from it. We verify every guest and look after them.
            </p>
          </div>
          <Link className="btn btn--primary home-earn__btn" href="/earn">
            Earn from events
          </Link>
        </div>
      </section>
      )}

      {/* ---------- COMING SOON: AI / marketplace / earn while switched off ---------- */}
      {soon.length > 0 && (
        <section className="section band-ink home-soon">
          <KolamRosette size={300} className="home-earn__kolam" />
          <div className="container">
            <p className="eyebrow">Coming soon to Zenfest</p>
            <h2 className="display-l">
              More ways to <span className="italic accent">celebrate</span>
            </h2>
            <ul className="home-soon__grid">
              {soon.map((f, i) => (
                <Reveal key={f.key} as="li" className="home-soon__card" delay={i * 70}>
                  <Link href={f.href}>
                    <span className="pill pill--soon">Soon</span>
                    <strong>{f.label}</strong>
                    <span className="muted">{f.body}</span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------- CLOSING CTA ---------- */}
      <section className="section cta-band band-ink">
        <KolamRosette size={340} className="cta-band__kolam" />
        <div className="container cta-band__inner">
          <p className="eyebrow">Take guard</p>
          <h2 className="display-l">
            Tell us about your <span className="italic accent">event</span>
          </h2>
          <p className="lede mx-auto text-center">
            Share a few details and we&apos;ll call you back with ideas and a quote. Most
            clients reach us fastest on WhatsApp.
          </p>
          <div className="btn-row cta-band__cta">
            <Link className="btn btn--primary" href="/enquire">
              Plan your event
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
