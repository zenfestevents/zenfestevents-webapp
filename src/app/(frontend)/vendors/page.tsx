import React from 'react'
import type { Metadata } from 'next'

import { VendorForm } from '../../../components/VendorForm'

export const metadata: Metadata = {
  title: 'Enroll as a Vendor',
  description:
    'Decorators, caterers, photographers and DJs — partner with Zenfest Events and get matched to events across Chennai.',
}

const PERKS = [
  ['Steady enquiries', 'Get matched to events that suit your work and location.'],
  ['One point of contact', 'We coordinate the client so you can focus on delivery.'],
  ['Grow your reach', 'Be part of weddings, corporate events and celebrations across Chennai.'],
]

export default function VendorsPage() {
  return (
    <section className="section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">For vendors</p>
          <h1 className="display-l">
            Partner with <span className="italic accent">Zenfest</span>
          </h1>
          <p className="lede">
            Are you a decorator, caterer, photographer, DJ or another event professional?
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
          <VendorForm />
        </div>
      </div>
    </section>
  )
}
