import React from 'react'
import type { Metadata } from 'next'

import { SignupForm } from '../../../components/SignupForm'
import { getSiteSettings } from '../../../lib/getSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign Up — ₹100 off',
  description:
    'Sign up with Zenfest Events and get ₹100 off your total bill. Weddings, birthdays, corporate functions and more across Chennai.',
}

const PERKS = [
  ['₹100 off your total bill', 'Applied when we quote your event — no code to remember.'],
  ['A birthday greeting', "We'll wish you, with a little something for the occasion."],
  ['First to hear', 'Seasonal offers and dates before they fill up.'],
]

export default async function SignupPage() {
  const settings = await getSiteSettings()

  return (
    <section className="section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">Sign up</p>
          <h1 className="display-l">
            Get <span className="italic accent">₹100 off</span> your total bill
          </h1>
          <p className="lede">
            Takes under a minute. Tell us who you are and we&apos;ll put ₹100 against your
            name — and if you&apos;re already planning something, we&apos;ll pick up the
            details from there.
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
          <h2 className="display-m">Your details</h2>
          <p className="muted">Fields marked * are required.</p>
          <SignupForm whatsapp={settings?.contact?.whatsapp} />
        </div>
      </div>
    </section>
  )
}
