import React from 'react'
import type { Metadata } from 'next'

import { VendorForm } from '../../../../components/VendorForm'
import { getSiteSettings } from '../../../../lib/getSettings'
import { verifyMode } from '../../../../lib/phoneVerification'

// Read the WhatsApp verification env at request time, not at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Partner with Zenfest — join our vendor team',
  description:
    'Photographers, videographers and bakers: join the Zenfest Events vendor team and work on the weddings and celebrations we plan across Tamil Nadu.',
}

const PERKS = [
  ['Steady work', 'We bring you into weddings and events we plan that suit your work and location.'],
  ['One point of contact', 'We coordinate the client so you can focus on delivery.'],
  ['Grow your reach', 'Be part of weddings, corporate events and celebrations in major cities across Tamil Nadu.'],
]

/**
 * The "work with Zenfest" lane: vendors apply to join the team that delivers the
 * events Zenfest plans. Separate from the marketplace (/vendors/marketplace), where
 * couples contact vendors directly. Saves a vendor-applications row → team email,
 * and Airtable for photo / cake (see VendorApplications + its hooks).
 */
export default async function VendorPartnerPage() {
  const settings = await getSiteSettings()
  return (
    <section className="section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">For vendors</p>
          <h1 className="display-l">
            Partner with <span className="italic accent">Zenfest</span>
          </h1>
          <p className="lede">
            Are you a photographer, videographer or baker? Join our vendor team and we&apos;ll bring you into the
            right events.
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
          <VendorForm verifyMode={verifyMode()} contact={settings.contact} />
        </div>
      </div>
    </section>
  )
}
