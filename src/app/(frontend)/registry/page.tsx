import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { KolamDivider, KolamRosette } from '../../../components/Kolam'
import { Reveal } from '../../../components/Reveal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Free Gift Registry for Weddings & Functions',
  description:
    'Make a free gift registry for your wedding, housewarming, birthday or pooja. Add gifts from Amazon, Flipkart or any shop, plus a shagun fund. Guests claim gifts so nobody buys the same thing twice.',
}

const STEPS = [
  ['Create your registry', 'Names, date and venue — it takes two minutes. No account, no fee.'],
  ['Add what you’d love', 'Paste links from Amazon, Flipkart or any store, add gifts from a local shop, or set up a shagun fund.'],
  ['Share on WhatsApp', 'Send one link with your invitation. Guests see the date, venue and your wishlist.'],
  ['No duplicate gifts', 'When a guest taps “I’ll gift this”, it’s reserved for them — nobody else can pick it.'],
]

const FEATURES = [
  ['Any store, any gift', 'Online links fill in the photo and price for you. Traditional gifts like a silver pooja set or a dinner set work too.'],
  ['Shagun, the easy way', 'Add your UPI ID and guests can bless you from their phone — straight to your account, no fees.'],
  ['The surprise stays a surprise', 'You see how many gifts are claimed, not who claimed them — unless you choose to look.'],
  ['Guest list & RSVPs', 'Keep your invite list in one place and send each guest a WhatsApp invite in one tap.'],
]

export default function RegistryLanding() {
  return (
    <>
      <section className="section band-ink reg-landing">
        <KolamRosette size={360} className="reg-landing__kolam" />
        <div className="container reg-landing__inner">
          <p className="eyebrow">Zenfest gift registry · free</p>
          <h1 className="display-l">
            Gifts you’ll <span className="italic accent">actually love</span>
          </h1>
          <p className="lede">
            One link for your wedding, housewarming, birthday or pooja. Guests pick from your wishlist — and
            nobody turns up with the third pressure cooker.
          </p>
          <div className="btn-row">
            <Link className="btn btn--primary" href="/registry/create">
              Create your registry
            </Link>
            <a className="btn btn--ghost" href="#how">
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="display-l">Ready before the invitations go out</h2>
            </div>
          </div>
          <ol className="earn-steps">
            {STEPS.map(([title, body], i) => (
              <Reveal as="li" key={title} className="earn-step" delay={i * 60}>
                <span className="earn-step__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="earn-step__title">{title}</h3>
                <p className="muted">{body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <KolamDivider />

      <section className="section band-soft">
        <div className="container">
          <div className="svc-grid">
            {FEATURES.map(([title, body], i) => (
              <Reveal key={title} className="svc-card" delay={i * 50}>
                <h3 className="svc-card__title">{title}</h3>
                <p className="muted">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-band band-ink">
        <KolamRosette size={340} className="cta-band__kolam" />
        <div className="container cta-band__inner">
          <p className="eyebrow">Free for every family</p>
          <h2 className="display-l">
            Start your <span className="italic accent">registry</span>
          </h2>
          <p className="lede mx-auto text-center">
            And when you’re ready to plan the celebration itself, Zenfest is right here.
          </p>
          <div className="btn-row cta-band__cta">
            <Link className="btn btn--primary" href="/registry/create">
              Create your registry
            </Link>
            <Link className="btn btn--ghost" href="/contact">
              Plan my event
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
