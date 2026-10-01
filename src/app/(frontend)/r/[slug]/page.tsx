import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { KolamDivider, KolamRosette } from '../../../../components/Kolam'
import { Countdown } from '../../../../components/registry/Countdown'
import { GuestRegistry } from '../../../../components/registry/GuestRegistry'
import { PlanBanner } from '../../../../components/registry/PlanBanner'
import { getPublicRegistry } from '../../../../lib/registry'
import { REGISTRY_EVENT_TYPES, labelFor } from '../../../../lib/registryOptions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicRegistry(slug)
  if (!data) return { title: 'Registry not found', robots: { index: false } }
  const { event } = data
  const description = `Gift registry for ${event.hostNames || event.title}. Pick a gift the family really wants — nobody else will buy the same one.`
  return {
    title: `${event.title} — Gift Registry`,
    description,
    // Registries are private family pages: shared on WhatsApp, not found on Google.
    robots: { index: false, follow: false },
    openGraph: { title: `${event.title} — Gift Registry`, description, type: 'website' },
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  // Exactly midnight IST means the host only gave a date.
  const ist = new Date(d.getTime() + 330 * 60_000)
  return ist.getUTCHours() === 0 && ist.getUTCMinutes() === 0 ? date : `${date} · ${time}`
}

export default async function RegistryPage({ params }: Props) {
  const { slug } = await params
  const data = await getPublicRegistry(slug)
  if (!data) notFound()
  const { event, items, polls } = data

  return (
    <>
      <section className="reg-hero band-ink">
        <KolamRosette className="reg-hero__kolam" />
        <div className="container reg-hero__inner">
          <p className="eyebrow">{labelFor(REGISTRY_EVENT_TYPES, event.eventType)} gift registry</p>
          <h1 className="reg-hero__title">{event.hostNames || event.title}</h1>
          {event.hostNames && event.title !== event.hostNames && (
            <p className="reg-hero__sub">{event.title}</p>
          )}
          <p className="reg-hero__when">{formatWhen(event.eventDate)}</p>
          {(event.venueName || event.venueCity) && (
            <p className="reg-hero__where">
              {[event.venueName, event.venueCity].filter(Boolean).join(', ')}
              {event.venueMapUrl && (
                <>
                  {' · '}
                  <a href={event.venueMapUrl} target="_blank" rel="noopener" className="accent">
                    Directions
                  </a>
                </>
              )}
            </p>
          )}
          <Countdown date={event.eventDate} />
        </div>
      </section>

      <section className="section--tight reg-body">
        <div className="container">
          {event.welcomeNote && (
            <blockquote className="reg-note">
              <p>{event.welcomeNote}</p>
            </blockquote>
          )}
          <GuestRegistry event={event} items={items} polls={polls} />
          <KolamDivider className="reg-divider" />
          <p className="reg-howto muted">
            Tap <strong>I’ll gift this</strong> to reserve a gift so nobody else buys the same one. Buying
            online? We’ll take you to the store — please have it delivered to the family or bring it along.
          </p>
        </div>
      </section>

      <PlanBanner referringEvent={event.slug} />
    </>
  )
}
