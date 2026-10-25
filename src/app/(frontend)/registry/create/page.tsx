import React from 'react'
import type { Metadata } from 'next'

import { CreateRegistryForm } from '../../../../components/registry/CreateRegistryForm'

// A cached page (CLAUDE.md, "Page caching"): rebuilt at most every 5 minutes, at once when /admin saves.
export const revalidate = 300

export const metadata: Metadata = {
  alternates: { canonical: '/registry/create' },
  title: 'Create a Gift Registry',
  description: 'Set up your free Zenfest gift registry in two minutes.',
}

export default function CreateRegistryPage() {
  return (
    <section className="section">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">Gift registry</p>
          <h1 className="display-l">
            Let’s set up your <span className="italic accent">registry</span>
          </h1>
          <p className="lede">
            Three quick steps. Then add gifts, share the link on WhatsApp and let your guests choose.
          </p>
          <div className="vendor-perks">
            <div className="vendor-perk">
              <strong>Free, no account</strong>
              <span className="muted">You get a private link to manage everything.</span>
            </div>
            <div className="vendor-perk">
              <strong>Change anything later</strong>
              <span className="muted">Date, venue, gifts — edit whenever you like.</span>
            </div>
          </div>
        </div>
        <div className="contact-form-wrap card">
          <CreateRegistryForm />
        </div>
      </div>
    </section>
  )
}
