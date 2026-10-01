import React from 'react'
import type { Metadata } from 'next'

import { whatsappLink, SITE_FALLBACK } from '../../../lib/site'
import { getSiteSettings } from '../../../lib/getSettings'
import { HostForm } from '../../../components/HostForm'
import { KolamDivider, KolamRosette } from '../../../components/Kolam'
import { Reveal } from '../../../components/Reveal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Earn from Your Event',
  description:
    'Open your wedding or family function in Tamil Nadu to a few curious travellers from abroad and earn from it. Zenfest Events verifies every guest and handles everything.',
}

/*
 * Hosts only for now: families apply, the team verifies them and arranges guests
 * and payouts offline. There is no guest booking or payment on the site yet.
 *
 * Indicative earnings per foreign guest — edit freely.
 */
const EARNINGS = [
  { label: 'One day', inr: '₹12,000', usd: '~$150', note: 'per guest, for a single day of your event' },
  { label: 'Two days or more', inr: '₹20,000', usd: '~$250', note: 'per guest, for the whole celebration' },
]

const PERKS = [
  ['Earn from your celebration', 'Guests pay to attend — most of it goes to your family.'],
  ['Only verified guests', 'We screen every traveller and introduce them to you first.'],
  ['Nothing extra to manage', 'We brief guests on customs and dress, and look after them on the day.'],
]

const STEPS = [
  ['Tell us about your event', 'Fill in the form — the function, the dates and how many guests you’d welcome.'],
  ['We meet your family', 'Our team calls and visits to understand your customs and your comfort level.'],
  ['We match travellers', 'Curious visitors from abroad who want to see a real Tamil celebration. You approve each guest.'],
  ['Celebrate & get paid', 'Guests join, share your joy and your meal. Your share is paid to you after the event.'],
]

const WHY = [
  ['Real event managers', 'We run weddings and functions across Tamil Nadu — your guests are in experienced hands.'],
  ['Etiquette briefing', 'Every guest learns what to wear, when to sit, how to bless the couple, and what not to do.'],
  ['A Zenfest point of contact', 'One person you can call before and during the event, so the family can focus on the function.'],
]

const FAQ = [
  [
    'Who are the guests?',
    'Travellers from abroad visiting India who want to experience a traditional celebration. We verify each one, share their details with you, and you can say no to anyone.',
  ],
  [
    'How many guests will come?',
    'Only as many as you choose — most families welcome one to four. Guests usually come as a couple or a small group.',
  ],
  [
    'What do guests do at the event?',
    'They attend the ceremonies like any other invitee, share the meal, and often love to dress up in a saree or veshti. Extras such as mehendi or photos with the family are entirely optional.',
  ],
  [
    'How and when do we get paid?',
    'Guests pay Zenfest Events in advance. Zenfest keeps a small service share and pays the rest to your family after the event, by bank transfer or UPI.',
  ],
  [
    'What if plans change?',
    'Tell us as early as you can. If the event is postponed or cancelled, we let the guests know and refund them — there is no penalty for your family.',
  ],
  [
    'Which places do you cover?',
    'Tamil Nadu for now — Chennai, Coimbatore, Madurai, Trichy and other towns across the state. More cities are coming.',
  ],
]

export default async function EarnPage() {
  const settings = await getSiteSettings()
  const contact = { ...SITE_FALLBACK.contact, ...(settings?.contact || {}) }
  const wa = whatsappLink(
    contact.whatsapp,
    'Hi Zenfest Events, I would like to know more about hosting guests at our event.',
  )

  return (
    <>
      {/* ---------- INTRO + APPLICATION ---------- */}
      <section className="section">
        <div className="container contact-layout">
          <div className="contact-intro">
            <p className="eyebrow">Earn from your event</p>
            <h1 className="display-l">
              Open your celebration to the <span className="italic accent">world</span>
            </h1>
            <p className="lede">
              Travellers from across the world dream of attending a real Tamil wedding. Welcome
              a few of them to your wedding or family function in Tamil Nadu, and earn from it —
              we verify every guest and take care of the rest.
            </p>

            <div className="vendor-perks">
              {PERKS.map(([title, body]) => (
                <div key={title} className="vendor-perk">
                  <strong>{title}</strong>
                  <span className="muted">{body}</span>
                </div>
              ))}
            </div>
          </div>

          <div id="apply" className="contact-form-wrap card">
            <h2 className="display-m">Apply to host</h2>
            <p className="muted">It takes two minutes. Fields marked * are required.</p>
            <HostForm whatsapp={contact.whatsapp} />
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="section band-ink">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="display-l">
                Four steps to your first <span className="italic accent">guest</span>
              </h2>
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

      {/* ---------- WHAT YOU EARN ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">What you earn</p>
              <h2 className="display-l">
                Your family keeps <span className="italic accent">most of it</span>
              </h2>
            </div>
          </div>
          <div className="earn-prices">
            {EARNINGS.map((e) => (
              <div key={e.label} className="earn-price card">
                <span className="earn-price__label">{e.label}</span>
                <span className="earn-price__amount">
                  {e.inr} <span className="earn-price__usd">{e.usd}</span>
                </span>
                <span className="muted">{e.note}</span>
              </div>
            ))}
          </div>
          <p className="muted earn-note">
            Guests pay this to attend, including the meal. Zenfest keeps a small service share and
            the rest is paid to your family after the event. Amounts are indicative — we confirm
            them with you before any guest is booked.
          </p>
        </div>
      </section>

      <KolamDivider />

      {/* ---------- WHY ZENFEST ---------- */}
      <section className="section band-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Why Zenfest</p>
              <h2 className="display-l">Hosted by people who run events</h2>
            </div>
          </div>
          <div className="svc-grid">
            {WHY.map(([title, body], i) => (
              <Reveal key={title} className="svc-card" delay={i * 50}>
                <h3 className="svc-card__title">{title}</h3>
                <p className="muted">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section">
        <div className="container earn-faq-wrap">
          <p className="eyebrow">Questions</p>
          <h2 className="display-l">Families usually ask</h2>
          <div className="earn-faq">
            {FAQ.map(([q, a]) => (
              <details key={q} className="earn-faq__item">
                <summary>{q}</summary>
                <p className="muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="section cta-band band-ink">
        <KolamRosette size={340} className="cta-band__kolam" />
        <div className="container cta-band__inner">
          <p className="eyebrow">Have an event coming up?</p>
          <h2 className="display-l">
            Share your <span className="italic accent">celebration</span>
          </h2>
          <p className="lede mx-auto text-center">
            Apply in two minutes, or message us on WhatsApp and we&apos;ll explain everything.
          </p>
          <div className="btn-row cta-band__cta">
            <a className="btn btn--primary" href="#apply">
              Apply to host
            </a>
            {contact.whatsapp && (
              <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                Ask on WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
