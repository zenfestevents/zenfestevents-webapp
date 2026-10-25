import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EventRequirementsForm } from '../../../components/EventRequirementsForm'
import { getSiteSettings } from '../../../lib/getSettings'
import { isEnquiryEvent } from '../../../lib/eventRequirements'
import { DEFAULT_WA_MESSAGE, SITE_FALLBACK, whatsappLink } from '../../../lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/enquire' },
  title: 'Plan your event — wedding, birthday or baby shower',
  description:
    'Tell Zenfest Events the basics of your wedding, reception, birthday or baby shower — date, place, guests, budget and the services you need — and we will call you back with ideas and a quote.',
}

type Props = { searchParams: Promise<{ event?: string }> }

/**
 * The main client call to action (bottom bar, header, hero): the team's Tally
 * "Basic Details" forms rebuilt on the site. `?event=wedding|birthday|babyshower`
 * skips the first question — the links to share in place of the old Tally ones.
 */
export default async function EnquirePage({ searchParams }: Props) {
  const { event } = await searchParams
  const settings = await getSiteSettings()
  const whatsapp = settings?.contact?.whatsapp || SITE_FALLBACK.contact.whatsapp
  const wa = whatsappLink(whatsapp, DEFAULT_WA_MESSAGE)

  return (
    <section className="section">
      <div className="container evq-layout">
        <header className="page-head">
          <p className="eyebrow">Plan your event</p>
          <h1 className="display-l">
            Tell us about your <span className="accent">celebration</span>
          </h1>
          <p className="lede">
            Wedding, birthday or baby shower — share the basics and we&apos;ll call you back with ideas and a quote.
            It takes about two minutes.
          </p>
        </header>

        <div className="card evq-card">
          <EventRequirementsForm whatsapp={whatsapp} initialEvent={isEnquiryEvent(event) ? event : undefined} />
        </div>

        <p className="muted evq-other">
          Something else, like a corporate event or housewarming? <Link href="/contact">Contact us</Link> or{' '}
          <a href={wa} target="_blank" rel="noopener">
            message us on WhatsApp
          </a>
          .
        </p>
      </div>
    </section>
  )
}
