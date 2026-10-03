import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { VendorForm } from '../../../components/VendorForm'
import { KolamDivider } from '../../../components/Kolam'
import { verifyMode } from '../../../lib/phoneVerification'
import { MARKET_CATEGORIES } from '../../../lib/marketplaceOptions'
import { getVendor } from '../../../lib/session'

// Read the session and the WhatsApp verification env at request time, not at build time.
export const dynamic = 'force-dynamic'

/**
 * Vendors sign up for a marketplace account and build their own listing. Set to
 * false to bring back the old one-shot application form (VendorForm), which the
 * dashboard's "Questions" tab still uses for photo and cake vendors.
 */
const VENDOR_ACCOUNTS = true

export const metadata: Metadata = {
  title: 'For Vendors — list your business free',
  description:
    'Photographers, makeup artists, decorators, caterers, bakers and halls — list your business free on the Zenfest marketplace and get real enquiries from couples across Chennai.',
}

const PERKS = [
  ['Steady enquiries', 'Get matched to events that suit your work and location.'],
  ['One point of contact', 'We coordinate the client so you can focus on delivery.'],
  ['Grow your reach', 'Be part of weddings, corporate events and celebrations across Chennai.'],
]

const PROMISES = [
  ['Free to list', 'No ₹50,000 packages, no 12-month lock-in. Listing on Zenfest costs nothing.'],
  ['Only real couples', 'Every enquiry comes from a logged-in couple with their date, guests, area and budget.'],
  ['Prices that filter for you', 'Your price card is public, so the people who call can afford you.'],
  ['A team that answers', 'Zenfest is a Chennai event company — we review every listing and pick up the phone.'],
] as const

const STEPS = [
  ['Create your account', 'Name, business, phone and a password. Two minutes.'],
  ['Build your listing', 'Write about your work, add an all-in price card, upload photos and block booked dates.'],
  ['We review it', 'Our team checks every listing (usually within 2 working days) and puts it live.'],
  ['Get enquiries', 'Reply from your dashboard, send a quote, and mark the date booked.'],
] as const

export default async function VendorsPage() {
  if (!VENDOR_ACCOUNTS) return <LegacyApplication />
  const vendor = await getVendor()

  return (
    <>
      <section className="section vendor-hero">
        <div className="container vendor-hero__inner">
          <p className="eyebrow">For vendors</p>
          <h1 className="display-l">
            List your business on the <span className="accent">Zenfest marketplace</span>
          </h1>
          <p className="lede">
            Couples in Chennai are planning smarter — comparing real prices and booking direct. Put your work in front
            of them, free.
          </p>
          <div className="btn-row">
            {vendor ? (
              <Link className="btn btn--gold" href="/vendors/dashboard">
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn--gold" href="/vendors/signup">
                  Create a free vendor account
                </Link>
                <Link className="btn btn--ghost" href="/vendors/login">
                  Vendor log in
                </Link>
              </>
            )}
          </div>
          <ul className="vendor-hero__cats">
            {MARKET_CATEGORIES.filter(([v]) => v !== 'other').map(([v, label]) => (
              <li key={v}>{label}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <h2 className="display-m">Why vendors choose Zenfest</h2>
          <div className="promise-grid">
            {PROMISES.map(([t, body]) => (
              <div key={t} className="promise card">
                <strong>{t}</strong>
                <p className="muted">{body}</p>
              </div>
            ))}
          </div>
          <KolamDivider />
          <h2 className="display-m">How it works</h2>
          <ol className="steps">
            {STEPS.map(([t, body], i) => (
              <li key={t} className="step">
                <span className="step__n">{i + 1}</span>
                <div>
                  <strong>{t}</strong>
                  <p className="muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          {!vendor && (
            <div className="btn-row">
              <Link className="btn btn--primary" href="/vendors/signup">
                Get started — it&apos;s free
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/** The pre-marketplace enrollment form, kept for when VENDOR_ACCOUNTS is off. */
function LegacyApplication() {
  return (
    <section className="section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">For vendors</p>
          <h1 className="display-l">
            Partner with <span className="italic accent">Zenfest</span>
          </h1>
          <p className="lede">
            Are you a photographer, videographer, cake maker or another event professional?
            Enroll with us and we&apos;ll bring you into the right events.
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

        <div className="contact-form-wrap card">
          <h2 className="display-m">Vendor application</h2>
          <p className="muted">Tell us about your work. Fields marked * are required.</p>
          <VendorForm verifyMode={verifyMode()} />
        </div>
      </div>
    </section>
  )
}
