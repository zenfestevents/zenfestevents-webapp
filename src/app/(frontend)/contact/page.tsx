import React from 'react'
import type { Metadata } from 'next'

import { whatsappLink, telLink, DEFAULT_WA_MESSAGE, SITE_FALLBACK } from '../../../lib/site'
import { getSiteSettings } from '../../../lib/getSettings'
import { InquiryForm } from '../../../components/InquiryForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact & Enquiry',
  description:
    'Request a callback from Zenfest Events, or reach us on phone and WhatsApp. Two branches near Chennai — Guduvancheri and Thiruverkadu.',
}

export default async function ContactPage() {
  const settings = await getSiteSettings()
  const contact = { ...SITE_FALLBACK.contact, ...(settings?.contact || {}) }
  const branches = settings?.branches?.length ? settings.branches : SITE_FALLBACK.branches
  const wa = whatsappLink(contact.whatsapp, DEFAULT_WA_MESSAGE)

  return (
    <section className="section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">Contact</p>
          <h1 className="display-l">
            Let&apos;s plan your <span className="italic accent">event</span>
          </h1>
          <p className="lede">
            Leave your details and we&apos;ll call you back — usually the same day. Prefer to
            talk now? Call or WhatsApp us directly.
          </p>

          <div className="contact-methods">
            {contact.phonePrimary && (
              <a className="contact-method" href={telLink(contact.phonePrimary)}>
                <span className="contact-method__label">Call</span>
                <span className="contact-method__value">{contact.phonePrimary}</span>
              </a>
            )}
            {contact.whatsapp && (
              <a className="contact-method" href={wa} target="_blank" rel="noopener">
                <span className="contact-method__label">WhatsApp</span>
                <span className="contact-method__value">Message us</span>
              </a>
            )}
            {contact.email && (
              <a className="contact-method" href={`mailto:${contact.email}`}>
                <span className="contact-method__label">Email</span>
                <span className="contact-method__value">{contact.email}</span>
              </a>
            )}
          </div>

          <div className="contact-branches">
            {branches.map((b, i) => (
              <div key={b.id || i} className="contact-branch">
                <strong>{b.name}</strong>
                {b.addressLine && <span className="muted">{b.addressLine}</span>}
                {b.phone && (
                  <a href={telLink(b.phone)} className="accent">
                    {b.phone}
                  </a>
                )}
                {b.mapUrl && (
                  <a href={b.mapUrl} target="_blank" rel="noopener" className="accent">
                    View on map →
                  </a>
                )}
              </div>
            ))}
          </div>
          {contact.hours && <p className="muted contact-hours">Hours: {contact.hours}</p>}
        </div>

        <div className="contact-form-wrap card">
          <h2 className="display-m">Request a callback</h2>
          <p className="muted">Fields marked * are required.</p>
          <InquiryForm whatsapp={contact.whatsapp} />
        </div>
      </div>
    </section>
  )
}
